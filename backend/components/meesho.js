const axios = require('axios');
const cheerio = require('cheerio');

// ✅ reusable request with timeout racing
async function fetchWithTimeout(requestFn, ms) {
    return Promise.race([
        requestFn(),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), ms))
    ]);
}

async function meesho(url) {
    const ACCESS_KEY   = process.env.SCRAPINGBOT_API_KEY;
    const SCRAPESTACK  = 'http://api.scrapestack.com/scrape';

    let html = null;

    // ✅ Strategy 1: direct fetch first (fast — ~1-3s vs 15-40s proxy)
    try {
        console.log('⚡ [Meesho] Trying direct fetch...');
        const res = await fetchWithTimeout(() => axios.get(url, {
            headers: {
                'User-Agent':      'Mozilla/5.0 (Linux; Android 10; SM-G981B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/80.0.3987.162 Mobile Safari/537.36',
                'Accept':          'text/html,application/xhtml+xml',
                'Accept-Language': 'en-US,en;q=0.9',
                'Referer':         'https://www.google.com/',
            }
        }), 8000); // ✅ 8s max — not 40s
        html = res.data;
        console.log('✅ [Meesho] Direct fetch worked');
    } catch (e) {
        console.warn('⚠️ [Meesho] Direct failed:', e.message);
    }

    // ✅ Strategy 2: proxy fallback — only if direct failed
    if (!html) {
        try {
            console.log('🛡️ [Meesho] Trying proxy...');
            const res = await fetchWithTimeout(() => axios.get(SCRAPESTACK, {
                params: { access_key: ACCESS_KEY, url, render_js: 0, premium_proxy: 0 }
            }), 20000); // ✅ reduced from 40s to 20s
            html = res.data;
            console.log('✅ [Meesho] Proxy fetch worked');
        } catch (e) {
            console.error('❌ [Meesho] Proxy failed:', e.message);
            return null;
        }
    }

    if (typeof html !== 'string' || html.length < 500) {
        console.error('❌ [Meesho] Empty/invalid HTML');
        return null;
    }

    // ✅ parse once
    const $ = cheerio.load(html);

    const result = {
        platform: 'Meesho',
        brand:    'Generic',
        rating:   null,
        price:    null,
        status:   'active',
        inStock:  true,
        currency: 'INR',
        name:     null,
        image:    null,
    };

    // ✅ extract __NEXT_DATA__ first — single source of truth for Meesho
    const nextRaw = $('#__NEXT_DATA__').html();
    if (nextRaw) {
        try {
            const state = JSON.parse(nextRaw);
            const p = state?.props?.pageProps?.initialState?.product?.details?.data;

            if (p) {
                result.name   = p.name          || p.display_name  || null;
                result.brand  = p.brand         || p.supplier_name || 'Generic';
                result.rating = p.review_summary?.data?.average_rating || null;
                result.price  = p.mrp           || p.price         || null;
                result.image  = p.images?.[0]?.url || p.cover_image || null;
                result.inStock = p.in_stock ?? true;
                console.log('✅ [Meesho] Extracted from __NEXT_DATA__');
            }
        } catch (e) {
            console.warn('⚠️ [Meesho] __NEXT_DATA__ parse failed:', e.message);
        }
    }

    // ✅ fallback to meta tags only if __NEXT_DATA__ missed fields
    if (!result.name) {
        result.name = $('meta[property="og:title"]').attr('content')?.split('-')[0].trim()
            || $('h1').first().text().trim()
            || null;
    }
    if (!result.image) {
        result.image = $('meta[property="og:image"]').attr('content')
            || $('img[alt="product"]').attr('src')
            || null;
    }
    if (!result.price) {
        const metaPrice = $('meta[property="product:price:amount"]').attr('content');
        if (metaPrice) {
            result.price = parseFloat(metaPrice);
        } else {
            const m = html.match(/"(?:price|mrp)"\s*:\s*(\d+)/i)
                   || html.match(/₹\s*([\d,]+)/);
            if (m) result.price = parseFloat(m[1].replace(/,/g, ''));
        }
    }

    if (!result.price) {
        console.error('❌ [Meesho] Price not found');
        return null;
    }

    console.log(`✅ [Meesho] ${result.name?.substring(0,30)} | ₹${result.price}`);
    return result;
}

module.exports = meesho;