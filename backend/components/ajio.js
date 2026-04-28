const axios = require('axios');
const cheerio = require('cheerio');

const SCRAPESTACK = 'http://api.scrapestack.com/scrape';

async function ajio(url) {
    const ACCESS_KEY = process.env.SCRAPINGBOT_API_KEY;

    // Run direct fetch and proxy fetch IN PARALLEL
    // Whoever wins first gets used — fastest possible response
    const html = await Promise.any([
        fetchDirect(url),
        fetchProxy(url, ACCESS_KEY),
    ]).catch(() => null);

    if (!html) {
        console.error('[Ajio] All fetch methods failed.');
        return null;
    }

    return parseAjioHtml(html, url);
}

async function fetchDirect(url) {
    const res = await axios.get(url, {
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language': 'en-IN,en-US;q=0.9',
            'Accept-Encoding': 'gzip, deflate, br',
            'sec-ch-ua': '"Chromium";v="124", "Google Chrome";v="124"',
            'sec-ch-ua-mobile': '?0',
            'sec-fetch-dest': 'document',
            'sec-fetch-mode': 'navigate',
            'sec-fetch-site': 'none',
        },
        timeout: 8000,
    });

    const html = typeof res.data === 'string' ? res.data : null;

    // Reject if Ajio served a bot-check page — forces Promise.any to use proxy
    if (!html || html.includes('__PRELOADED_STATE__') === false) {
        throw new Error('Direct fetch blocked or incomplete');
    }

    console.log('[Ajio] Direct fetch won the race ⚡');
    return html;
}

async function fetchProxy(url, key) {
    // Add a small delay so direct fetch wins if it's fast enough
    // This avoids wasting a paid proxy call on every request
    await new Promise(r => setTimeout(r, 1500));

    const res = await axios.get(SCRAPESTACK, {
        params: { access_key: key, url, render_js: 0 },
        timeout: 30000,
    });

    const html = typeof res.data === 'string' ? res.data : null;
    if (!html) throw new Error('Proxy returned empty response');

    console.log('[Ajio] Proxy fetch won the race 🔄');
    return html;
}

function parseAjioHtml(html, url) {
    const $ = cheerio.load(html);

    const result = {
        name:     null,
        price:    null,
        image:    null,
        platform: 'Ajio',
        brand:    '-',
        rating:   0,
        currency: 'INR',
        status:   'active',
        inStock:  true,
        method:   null,
    };

    // ── Method 1: __PRELOADED_STATE__ ──────────────────────────────────────
    if (html.includes('window.__PRELOADED_STATE__')) {
        try {
            const marker = 'window.__PRELOADED_STATE__ = ';
            const start  = html.indexOf(marker) + marker.length;
            const end    = html.indexOf('</script>', start);
            const raw    = html.slice(start, end).replace(/;\s*$/, '').trim();
            const state  = JSON.parse(raw);
            const p      = state?.product?.productDetails;

            if (p) {
                result.name   = p.name || p.displayName;
                result.brand  = p.brandName || p.brand?.name || '-';
                result.image  = p.baseImageUrl || p.images?.[0]?.url;
                result.rating = p.averageRating || p.rating || 0;

                const pr = p.price;
                if (pr) result.price = pr.value ?? pr.sellingPrice ?? pr.maxPrice ?? null;

                if (p.availability === 'OUT_OF_STOCK' || p.inStock === false) {
                    result.inStock = false;
                    result.status  = 'out_of_stock';
                }

                result.method = 'preloaded-state';
            }
        } catch (e) {
            console.warn('[Ajio] State parse failed:', e.message);
        }
    }

    // ── Method 2: JSON-LD ──────────────────────────────────────────────────
    if (!result.name || !result.price) {
        $('script[type="application/ld+json"]').each((_, el) => {
            try {
                const json = JSON.parse($(el).html());
                const p    = Array.isArray(json)
                    ? json.find(x => x['@type'] === 'Product')
                    : (json['@type'] === 'Product' ? json : null);

                if (!p) return;

                result.name   = result.name  || p.name;
                result.image  = result.image || (Array.isArray(p.image) ? p.image[0] : p.image);
                result.brand  = result.brand === '-' ? (p.brand?.name || '-') : result.brand;
                result.rating = result.rating || parseFloat(p.aggregateRating?.ratingValue) || 0;

                if (!result.price && p.offers) {
                    const price = parseFloat(p.offers.price || p.offers.lowPrice);
                    if (price > 0) result.price = price;
                }

                result.method = result.method || 'json-ld';
            } catch {}
        });
    }

    // ── Method 3: Cleaned meta title ───────────────────────────────────────
    if (!result.name) {
        const raw = $('meta[property="og:title"]').attr('content') || $('title').text();
        if (raw) {
            result.name = raw
                .replace(/^Buy\s+/i, '')
                .replace(/\s+online\s+at\s+AJIO.*$/i, '')
                .replace(/\s*\|\s*AJIO.*$/i, '')
                .trim();
            result.method = result.method || 'meta-title';
        }
    }

    // ── Method 4: Price-specific regex ─────────────────────────────────────
    if (!result.price) {
        for (const pat of [
            /"(?:sellingPrice|finalPrice|salePrice|discountedPrice)"\s*:\s*([\d.]+)/i,
            /"price"\s*:\s*\{\s*"value"\s*:\s*([\d.]+)/i,
            /"price"\s*:\s*([\d]{2,6}(?:\.\d{1,2})?)[^"]/i,
        ]) {
            const m = html.match(pat);
            if (m) { result.price = parseFloat(m[1]); break; }
        }
    }

    // ── Image fallback ──────────────────────────────────────────────────────
    if (!result.image) {
        result.image = $('meta[property="og:image"]').attr('content') || null;
    }

    // ── URL slug fallback for name ──────────────────────────────────────────
    if (!result.name) {
        const m = url.match(/ajio\.com\/([^/?]+)\//i);
        if (m) {
            result.name   = m[1].replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
            result.method = 'url-slug';
        }
    }

    // ── Validate ────────────────────────────────────────────────────────────
    if (!result.name || !result.price) {
        console.error(`[Ajio] Failed — name:${!!result.name} price:${!!result.price}`);
        return null;
    }

    console.log(`✅ [Ajio] ${result.name} | ₹${result.price} (${result.method})`);
    return result;
}

module.exports = ajio;