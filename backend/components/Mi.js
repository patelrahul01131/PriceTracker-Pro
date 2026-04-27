const axios = require('axios');

async function scrapeMi(url) {
    const PLATFORM = 'Mi/Xiaomi';
    const log = (phase, msg) => console.log(`[${PLATFORM}] [${phase}] ${msg}`);

    // ── extract product tag from URL ──
    // URL format: mi.com/in/product/redmi-note-15-se-5g/buy/
    const productTag = url.match(/\/product\/([^\/\?]+)/)?.[1];
    log('INIT', `Product tag: ${productTag}`);

    if (!productTag) {
        return { success: false, errorType: 'BAD_URL', message: 'Could not extract product tag', platform: PLATFORM };
    }

    const BASE = 'https://in-go.buy.mi.com/in';
    const HEADERS = {
        'User-Agent':  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36',
        'Accept':      'application/json',
        'Referer':     'https://www.mi.com/',
        'Origin':      'https://www.mi.com',
    };

    try {
        // ── Strategy 1: structured-data API (most reliable — directly has price+image+rating) ──
        log('API', 'Fetching structured-data...');
        const structuredRes = await axios.get(
            `${BASE}/productstation/structured-data?product_name=${productTag}&page_name=buy`,
            { headers: HEADERS, timeout: 10000 }
        );

        const sd = structuredRes.data?.data;
        log('API', `structured-data: price=${sd?.price}, rating=${sd?.rating_value}`);

        // ── Strategy 2: productinfo API (has MRP/rrp) ──
        log('API', 'Fetching productinfo...');
        const infoRes = await axios.get(
            `${BASE}/v2/item/productinfo?tag=${productTag}&is_bundle=undefined`,
            { headers: HEADERS, timeout: 10000 }
        );
        const info = infoRes.data?.data;
        log('API', `productinfo: min_price=${info?.item_min_price}, rrp=${info?.rrp}`);

        // ── Strategy 3: reviewheader API (has variant images + styles) ──
        log('API', 'Fetching reviewheader...');
        const reviewRes = await axios.post(
            `${BASE}/comment/reviewheader`,
            // ✅ send as URLSearchParams not JSON
            new URLSearchParams({ tag: productTag }),
            { 
                headers: { 
                    ...HEADERS, 
                    'Content-Type': 'application/x-www-form-urlencoded'
                }, 
                timeout: 10000 
            }
        );
        const review = reviewRes.data?.data;
        const commodity = review?.commodity;
        log('API', `reviewheader: price=${commodity?.price}, styles=${commodity?.style?.length}`);

        // ── assemble final product data ──
        const price = sd?.price
            || info?.item_min_price
            || parseFloat(commodity?.price?.replace(/,/g, ''))
            || null;

        const mrp = info?.rrp
            || parseFloat(commodity?.market_price?.replace(/,/g, ''))
            || null;

        const image = sd?.image?.[0]
            || commodity?.style?.[0]?.image
            || null;

        const name = commodity?.style?.[0]?.name?.replace(/\s+\d+\s*GB.*$/i, '').trim()
            || productTag.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());

        const rating  = parseFloat(sd?.rating_value) || null;
        const inStock = sd?.availability?.includes('InStock') ?? true;

        // ── variants (all color/storage options) ──
        const variants = commodity?.style?.map(s => ({
            id:      s.commodity_id,
            name:    s.name,
            image:   s.image,
            inStock: s.is_sale,
        })) || [];

        if (!price) {
    log('ERROR', 'Price not found in any API');
    return null; // ✅ return null so controller's !product check works
    }

    log('SUCCESS', `${name} | ₹${price}`);

    // ✅ return flat object matching what controller expects
    return {
        name,
        price,
        mrp,
        currency:      'INR',
        image,
        brand:         'Xiaomi/Redmi',
        rating,
        inStock,
        platform:      'Mi/Xiaomi',
        status:        'active',
        variants,
    };
    } catch (error) {
        log('FATAL', error.message);
        return { success: false, errorType: 'FATAL_ERROR', message: error.message, platform: PLATFORM };
    }
}

module.exports = scrapeMi;