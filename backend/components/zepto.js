const cheerio = require('cheerio');
const { CookieJar } = require('tough-cookie');

async function fetchWithCookies(url, jar, options = {}) {
    const cookies = jar.getCookiesSync(url).map(c => `${c.key}=${c.value}`).join('; ');
    const res = await fetch(url, {
        ...options,
        headers: { ...options.headers, ...(cookies ? { cookie: cookies } : {}) },
    });
    for (const c of (res.headers.getSetCookie?.() || [])) jar.setCookieSync(c, url);
    return res;
}

async function zepto(productUrl) {
    console.log(`\n🚀 [Zepto] ${productUrl}`);

    const pvid = productUrl.match(/pvid\/([a-f0-9-]+)/i)?.[1];
    const slug = productUrl.match(/\/pn\/([^/]+)\/pvid/)?.[1];
    if (!pvid || !slug) { console.error('❌ Cannot parse URL'); return null; }

    // Strategy 1: Direct page — parses self.__next_f.push() RSC data
    try {
        const r = await zeptoDirect(productUrl, pvid);
        if (r) { console.log(`✅ [Direct] ${r.name} ₹${r.price}`); return r; }
    } catch (e) { console.warn(`⚠️ [Direct] ${e.message}`); }

    // Strategy 2: RSC endpoint
    try {
        const r = await zeptoRSC(productUrl, slug, pvid);
        if (r) { console.log(`✅ [RSC] ${r.name} ₹${r.price}`); return r; }
    } catch (e) { console.warn(`⚠️ [RSC] ${e.message}`); }

    console.error(`❌ All strategies failed`);
    return null;
}

// ── Strategy 1: Direct page (App Router RSC streaming in script tags) ─────
async function zeptoDirect(productUrl, pvid) {
    const jar = new CookieJar();
    await fetchWithCookies('https://www.zepto.com/', jar, { headers: desktopHeaders() });
    await sleep(800, 1500);

    const res = await fetchWithCookies(productUrl, jar, {
        headers: { ...desktopHeaders(), 'referer': 'https://www.zepto.com/', 'sec-fetch-site': 'same-origin' },
    });

    const html = await res.text();
    console.log(`📄 Direct page: ${res.status} (${html.length} chars)`);

    // Zepto App Router: data is in self.__next_f.push([1, "...json..."]) script blocks
    // Concatenate all push payloads into one searchable string
    const $ = cheerio.load(html);
    const rscChunks = [];
    $('script').each((_, el) => {
        const content = $(el).html() || '';
        // Collect all __next_f.push content
        const matches = [...content.matchAll(/self\.__next_f\.push\(\[1,"((?:[^"\\]|\\.)*)"\]\)/g)];
        for (const m of matches) {
            try { rscChunks.push(JSON.parse(`"${m[1]}"`)); } catch (_) {}
        }
    });

    const fullText = rscChunks.join('');
    console.log(`📦 RSC chunks total: ${fullText.length} chars, pvid present: ${fullText.includes(pvid)}`);

    if (fullText.length > 0) {
        const result = extractProductFromText(fullText, pvid);
        if (result) return result;
    }

    // Fallback: search raw HTML directly
    return extractProductFromText(html, pvid);
}

// ── Strategy 2: RSC endpoint ──────────────────────────────────────────────
async function zeptoRSC(productUrl, slug, pvid) {
    const jar = new CookieJar();
    await fetchWithCookies('https://www.zepto.com/', jar, { headers: desktopHeaders() });
    await sleep(600, 1200);

    const stateTree = JSON.stringify([
        "", { children: ["(main)", { children: ["pn", { children: ["desktop", { children: [[slug, slug, "d"], { children: ["pvid", { children: [[pvid, pvid, "d"], { children: ["__PAGE__", {}] }] }] }] }] }] }] }, null, null, true
    ]);

    const res = await fetchWithCookies(`${productUrl}?_rsc=${randomHex(5)}`, jar, {
        headers: {
            ...desktopHeaders(),
            'accept': '*/*',
            'rsc': '1',
            'next-router-state-tree': encodeURIComponent(stateTree),
            'next-url': `/pn/desktop/${slug}/pvid/${pvid}`,
            'traceparent': `00-${randomHex(32)}-${randomHex(16)}-01`,
            'sec-fetch-dest': 'empty',
            'sec-fetch-mode': 'cors',
            'sec-fetch-site': 'same-origin',
            'referer': productUrl,
        },
    });

    console.log(`📡 RSC: ${res.status}`);
    const text = await res.text();
    return extractProductFromText(text, pvid);
}

// ── Core extractor — works on any text containing the RSC/HTML payload ────
function extractProductFromText(text, pvid) {
    // Approach A: Find JSON blob containing pvid and extract product fields
    const pvidIdx = text.indexOf(pvid);
    if (pvidIdx !== -1) {
        // Search a window around the pvid
        const chunk = text.slice(Math.max(0, pvidIdx - 5000), pvidIdx + 5000);
        const result = extractFromChunk(chunk);
        if (result) return result;
    }

    // Approach B: Find discountedSellingPrice near product name
    // Look for the productVariant block which has id = pvid
    const variantPattern = new RegExp(`"id":"${pvid}"[^}]{0,2000}"mrp":(\\d+)`, 's');
    const variantMatch = text.match(variantPattern);
    if (variantMatch) {
        const startIdx = text.indexOf(`"id":"${pvid}"`);
        const chunk = text.slice(Math.max(0, startIdx - 2000), startIdx + 3000);
        const result = extractFromChunk(chunk);
        if (result) return result;
    }

    // Approach C: Parse full text for discountedSellingPrice + name near each other
    return extractFromChunk(text);
}

function extractFromChunk(chunk) {
    // 1. Broadened price match to catch any integer length
    const priceMatch  = chunk.match(/"discountedSellingPrice"\s*:\s*(\d+)/) || 
                        chunk.match(/"sellingPrice"\s*:\s*(\d+)/);
    const mrpMatch    = chunk.match(/"mrp"\s*:\s*(\d+)/);
    
    // 2. Relaxed name match to accept ANY product name string
    const nameMatch   = chunk.match(/"name"\s*:\s*"([^"\\]*(?:\\.[^"\\]*)*)"/);
    
    // 3. Relaxed brand match
    const brandMatch  = chunk.match(/"brand"\s*:\s*"([^"]+)"/);
    const ratingMatch = chunk.match(/"averageRating"\s*:\s*([\d.]+)/);

    if (!priceMatch || !nameMatch) return null;

    // Convert Zepto's backend Paise to standard Rupees
    let price = parseInt(priceMatch[1]);
    if (price > 1000) price /= 100; 

    let mrp = mrpMatch ? parseInt(mrpMatch[1]) : null;
    if (mrp && mrp > 1000) mrp /= 100;

    // Clean up escaped unicode characters (like \u0026 for &) in the name
    let cleanName = nameMatch[1].replace(/\\u[\dA-F]{4}/gi, match => {
        return String.fromCharCode(parseInt(match.replace(/\\u/g, ''), 16));
    });

    return {
        platform: 'Zepto',
        name:     cleanName,
        brand:    brandMatch?.[1] || '-',
        price,
        mrp,
        rating:   ratingMatch ? parseFloat(ratingMatch[1]) : 0,
    };
}

// ── Helpers ───────────────────────────────────────────────────────────────
function desktopHeaders() {
    return {
        'user-agent':                'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36',
        'accept':                    'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        'accept-language':           'en-IN,en-US;q=0.9,en;q=0.8',
        'accept-encoding':           'gzip, deflate, br',
        'sec-ch-ua':                 '"Google Chrome";v="147", "Not.A/Brand";v="8", "Chromium";v="147"',
        'sec-ch-ua-mobile':          '?0',
        'sec-ch-ua-platform':        '"Windows"',
        'sec-fetch-dest':            'document',
        'sec-fetch-mode':            'navigate',
        'sec-fetch-site':            'none',
        'dnt':                       '1',
    };
}

const randomHex = n => [...Array(n)].map(() => Math.floor(Math.random() * 16).toString(16)).join('');
const sleep = (min, max) => new Promise(r => setTimeout(r, Math.floor(Math.random() * (max - min + 1)) + min));

module.exports = zepto;