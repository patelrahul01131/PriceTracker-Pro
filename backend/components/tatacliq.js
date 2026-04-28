const axios   = require('axios');
const cheerio = require('cheerio');

async function scrapeTataCliq(url) {
    const PLATFORM = 'TataCliq';

    // ── extract product code from URL ──
    // URL format: /product-name/p-PRODUCTCODE
    const productCode = url.match(/\/p-([A-Z0-9]+)/i)?.[1];
    console.log(`[${PLATFORM}] Product code:`, productCode);

    // ── Strategy 1: Internal marketplacewebservices API ──
    if (productCode) {
        try {
            console.log(`[${PLATFORM}] Trying internal API...`);

            const apiUrl = `https://www.tatacliq.com/marketplacewebservices/v2/mpl/products/mpl/${productCode}?isPwa=true&isMsite=true&channel=msite`;

            const res = await axios.get(apiUrl, {
                headers: {
                    'User-Agent':      'Mozilla/5.0 (Linux; Android 6.0; Nexus 5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Mobile Safari/537.36',
                    'Accept':          'application/json',
                    'Accept-Language': 'en-US,en;q=0.9',
                    'Referer':         'https://www.tatacliq.com/',
                    'Origin':          'https://www.tatacliq.com',
                    'x-channel':       'msite',
                },
                timeout: 15000
            });

            const d = res.data;
            console.log(`[${PLATFORM}] API response keys:`, Object.keys(d).join(', '));

            // navigate response structure
            const product  = d?.product || d?.productData || d;
            const price    = product?.sellingPrice?.value
                          || product?.price?.value
                          || product?.basePrice?.value
                          || product?.mrpPrice?.value
                          || null;

            const name     = product?.productName
                          || product?.name
                          || product?.title
                          || null;

            const image    = product?.galleryImages?.[0]
                          || product?.imageUrl
                          || product?.primaryImage
                          || null;

            const brand    = product?.brandName || product?.brand?.name || null;
            const inStock  = !product?.availability?.includes?.('OutOfStock') ?? true;
            const rating   = parseFloat(product?.averageRating || product?.rating) || null;

            if (price) {
                console.log(`✅ [${PLATFORM}] Scraped via internal API`);
                return {
                    platform:"TataCliq",
                    name,
                    price:    parseFloat(price),
                    currency: 'INR',
                    image:    image?.startsWith('http') ? image : `https://img.tatacliq.com${image}`,
                    brand,
                    rating:parseFloat(rating),
                    inStock,
                    status: inStock ? "active" : "out_of_stock",
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                    failedSnapshot: null,
                };
            }

        } catch (err) {
            console.warn(`[${PLATFORM}] Internal API failed:`, err.response?.status, err.message);
        }
    }

    // ── Strategy 2: Direct HTML + JSON-LD ──
    try {
        console.log(`[${PLATFORM}] Trying direct HTML...`);

        const res = await axios.get(url, {
            headers: {
                'User-Agent':      'Mozilla/5.0 (Linux; Android 6.0; Nexus 5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Mobile Safari/537.36',
                'Accept':          'text/html,application/xhtml+xml',
                'Accept-Language': 'en-US,en;q=0.9',
                'Referer':         'https://www.google.com/',
            },
            timeout: 20000
        });

        const $ = cheerio.load(res.data);

        // JSON-LD
        let name = null, price = null, image = null, brand = null, inStock = true, status = "active",platform=PLATFORM,currency='INR';

        $('script[type="application/ld+json"]').each((_, el) => {
            try {
                const json = JSON.parse($(el).html());
                const item = Array.isArray(json)
                    ? json.find(i => i['@type'] === 'Product')
                    : json['@type'] === 'Product' ? json : null;
                if (item) {
                    const offer = Array.isArray(item.offers) ? item.offers[0] : item.offers;
                    price = parseFloat(offer?.price);
                    name  = item.name;
                    image = Array.isArray(item.image) ? item.image[0] : item.image;
                    brand = item.brand?.name;
                    rating = item.aggregateRating?.ratingValue;
                    inStock = item.offers?.availability;
                }
            } catch {}
        });

        // meta tag fallbacks
        name  = name  || $('meta[property="og:title"]').attr('content')?.trim();
        image = image || $('meta[property="og:image"]').attr('content');

        // regex fallbacks on raw HTML
        const html = res.data;
        if (!price) {
            const patterns = [
                /"sellingPrice"\s*:\s*\{[^}]*"value"\s*:\s*([\d.]+)/,
                /"price"\s*:\s*\{[^}]*"value"\s*:\s*([\d.]+)/,
                /"mrpPrice"\s*:\s*\{[^}]*"value"\s*:\s*([\d.]+)/,
                /"sellingPrice"\s*:\s*([\d.]+)/,
                /"price"\s*:\s*([\d.]+)/,
            ];
            for (const p of patterns) {
                const m = html.match(p);
                if (m) { price = parseFloat(m[1]); break; }
            }
        }

        if (!name) {
            const m = html.match(/"productName"\s*:\s*"([^"]{5,150})"/);
            if (m) name = m[1];
        }

        if (!image) {
            const m = html.match(/"imageUrl"\s*:\s*"([^"]+\.(?:jpg|jpeg|png|webp))"/i);
            if (m) image = m[1].startsWith('http') ? m[1] : `https://img.tatacliq.com${m[1]}`;
        }

        if(!rating){
            rating = $('meta[property="og:rating"]').attr('content');
        }

        if (price) {
            console.log(`✅ [${PLATFORM}] Scraped via HTML`);
            return { name, price, currency: 'INR', image, brand, inStock: true ,platform:PLATFORM,rating:parseFloat(rating).toFixed(1),status:inStock ? "active" : "out_of_stock",createdAt:new Date().toISOString(),updatedAt:new Date().toISOString(),failedSnapshot:null};
        }

    } catch (err) {
        console.warn(`[${PLATFORM}] HTML scrape failed:`, err.message);
    }

    console.error(`❌ [${PLATFORM}] All strategies failed`);
    return null;
}

module.exports = scrapeTataCliq;