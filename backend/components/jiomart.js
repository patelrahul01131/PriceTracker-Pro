const axios = require('axios');
const cheerio = require('cheerio');

async function scrapJioMart(url) {
    const PLATFORM = "JioMart";
    const ACCESS_KEY = process.env.SCRAPINGBOT_API_KEY;

    const log = (phase, msg) => console.log(`[${PLATFORM}] [${phase}] ${msg}`);
    let snapshot = { name: null, price: null, mrp: null, image: null, brand: "-", rating: 0, reviewsCount: 0, status: "active", inStock: true };

    if (url.match(/\/(c|category|s|search)\//i) && !url.includes('/p/')) {
        log('ERROR', "Category URL detected.");
        return null;
    }

    const productIdMatch = url.match(/\/p\/[^\/]+\/(\d+)/i) || url.match(/\/(\d+)(?:\?|\/|$)/);
    const productId = productIdMatch ? productIdMatch[1] : null;

    // Detect fashion URL — these require JS rendering
    const isFashion = /\/p\/fashion\//i.test(url);

    // ─── LAYER 0: JioMart Internal Product API ───
    if (productId) {
        const apiEndpoints = [
            `https://www.jiomart.com/catalog/product/get_product/${productId}`,
            `https://www.jiomart.com/moonx/rest/v2/pdp/productdetails/${productId}`,
            `https://www.jiomart.com/moonx/rest/v1/pdp/productdetails?product_id=${productId}`,
            `https://www.jiomart.com/catalog/product/getProductDetails/${productId}`,
        ];

        for (const endpoint of apiEndpoints) {
            try {
                log('API', `Trying endpoint: ${endpoint}`);
                const apiRes = await axios.get(endpoint, {
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
                        'Accept': 'application/json, text/plain, */*',
                        'Referer': url,
                        'X-Requested-With': 'XMLHttpRequest'
                    },
                    timeout: 8000
                });

                const d = apiRes.data;
                if (!d || typeof d !== 'object') continue;

                log('API', `Endpoint responded: ${endpoint}`);

                snapshot.price =
                    d.price?.offerPrice   ?? d.price?.finalPrice   ??
                    d.price?.sellingPrice ?? d.price?.discountedPrice ??
                    d.price?.salePrice    ?? d.price?.sp            ??
                    d.offerPrice   ?? d.finalPrice   ??
                    d.sellingPrice ?? d.discountedPrice ??
                    d.salePrice    ?? d.sp ?? null;

                snapshot.mrp =
                    d.price?.mrp ?? d.price?.maxPrice ??
                    d.price?.originalPrice ?? d.price?.strikePrice ??
                    d.mrp ?? d.maxPrice ?? d.originalPrice ?? null;

                snapshot.name  = d.name || d.productName || d.title || d.product_name || null;
                snapshot.brand = (typeof d.brand === 'object' ? d.brand?.name : d.brand) || d.brandName || d.brand_name || '-';
                snapshot.rating = d.rating?.avgRating ?? d.avgRating ?? d.aggregateRating?.ratingValue ?? 0;
                snapshot.reviewsCount = d.rating?.totalReviews ?? d.totalReviews ?? d.aggregateRating?.reviewCount ?? d.noOfRatings ?? 0;
                snapshot.image = d.image || d.imageUrl || d.thumbnail || d.productImage || d.image_url || null;

                if (d.inStock === false || d.availability === 'OutOfStock' || d.stockStatus === 0) {
                    snapshot.inStock = false;
                    snapshot.status  = 'out_of_stock';
                }

                if (snapshot.price && typeof snapshot.price === 'string')
                    snapshot.price = parseFloat(snapshot.price.replace(/[^\d.]/g, ''));
                if (snapshot.price) snapshot.price = parseFloat(snapshot.price);
                if (snapshot.mrp)   snapshot.mrp   = parseFloat(snapshot.mrp);

                log('API', `Extracted → Price: ${snapshot.price} | Name: ${String(snapshot.name || '').substring(0, 30)}`);
                if (snapshot.price && !isNaN(snapshot.price)) break;

            } catch(e) {
                log('API', `Endpoint failed (${endpoint}): ${e.message}`);
            }
        }

        if (!snapshot.price || isNaN(snapshot.price))
            log('API', 'All API endpoints exhausted. Falling through to HTML layers.');
    }

    // ─── HTML FETCH ───
    let html = null;
    const needsHtml = !snapshot.price || !snapshot.name || !snapshot.image;

    if (needsHtml) {
        log('NETWORK', `Fetching URL: ${url} | Fashion: ${isFashion}`);

        // ── Direct fetch (non-fashion only — fashion has no price in static HTML) ──
        if (!isFashion) {
            try {
                const direct = await axios.get(url, {
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
                        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
                        'Accept-Language': 'en-US,en;q=0.9',
                        'sec-ch-ua': '"Chromium";v="124", "Google Chrome";v="124", "Not-A.Brand";v="99"',
                        'sec-ch-ua-mobile': '?0',
                        'sec-ch-ua-platform': '"Windows"',
                        'sec-fetch-dest': 'document',
                        'sec-fetch-mode': 'navigate',
                        'sec-fetch-site': 'none',
                        'sec-fetch-user': '?1',
                        'upgrade-insecure-requests': '1'
                    },
                    timeout: 8000
                });

                const lowerData = direct.data.toLowerCase();
                if (
                    lowerData.includes('cloudflare') ||
                    lowerData.includes('just a moment') ||
                    lowerData.includes('access denied') ||
                    lowerData.includes('reference #') ||
                    lowerData.includes('akamai')
                ) throw new Error("WAF Blocked");

                html = direct.data;
                log('NETWORK', 'Direct fetch successful.');

            } catch(e) {
                log('NETWORK', `Direct failed (${e.message}). Routing to proxy (render_js: 0)...`);
                html = await fetchViaProxy(url, ACCESS_KEY, 0, log);
            }
        } else {
            // Fashion: skip direct fetch entirely, go straight to JS-rendered proxy
            log('NETWORK', 'Fashion URL — skipping direct fetch, using JS-rendered proxy.');
            html = await fetchViaProxy(url, ACCESS_KEY, 1, log);
        }

    } else {
        log('NETWORK', 'Skipping HTML fetch — API provided all required fields.');
    }

    // ─── HTML PARSING LAYERS ───
    if (html) {
        log('PARSE', `Parsing HTML (size: ${html.length})...`);
        const $ = cheerio.load(html);

        if (
            $('.sold-out, .out-of-stock').length > 0 ||
            html.includes('"availability":"OutOfStock"') ||
            html.includes('"inStock":false')
        ) {
            snapshot.inStock = false;
            snapshot.status  = "out_of_stock";
        }

        // ─── LAYER 1: Meta SEO ───
        if (!snapshot.price || isNaN(snapshot.price)) {
            try {
                const metaPrice =
                    $('meta[property="product:price:amount"]').attr('content') ||
                    $('meta[itemprop="price"]').attr('content') ||
                    $('meta[property="og:price:amount"]').attr('content');
                if (metaPrice) {
                    snapshot.price = parseFloat(metaPrice);
                    log('EXTRACT', `Price from meta: ${snapshot.price}`);
                }
            } catch(e) {}
        }

        // ─── LAYER 1.5: __NEXT_DATA__ ───
        if (!snapshot.price || isNaN(snapshot.price)) {
            try {
                const nextDataMatch = html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/i);
                if (nextDataMatch) {
                    log('EXTRACT', '__NEXT_DATA__ block found.');
                    const flat = JSON.stringify(JSON.parse(nextDataMatch[1]));
                    extractFromFlat(flat, snapshot, log, '__NEXT_DATA__');
                }
            } catch(e) { log('WARN', `__NEXT_DATA__ parse failed: ${e.message}`); }
        }

        // ─── LAYER 2: JSON-LD ───
        try {
            $('script[type="application/ld+json"]').each((i, el) => {
                const raw = $(el).html();
                if (!raw) return;
                try {
                    const json = JSON.parse(raw);
                    let items = json['@graph'] ? json['@graph'] : (Array.isArray(json) ? json : [json]);
                    const product = items.find(x =>
                        x['@type'] === 'Product' ||
                        (Array.isArray(x['@type']) && x['@type'].includes('Product'))
                    );
                    if (product) {
                        if (!snapshot.name) snapshot.name = product.name;
                        if (product.brand) snapshot.brand = typeof product.brand === 'object' ? product.brand.name : product.brand;
                        if (product.aggregateRating) {
                            if (!snapshot.rating)       snapshot.rating       = parseFloat(product.aggregateRating.ratingValue) || 0;
                            if (!snapshot.reviewsCount) snapshot.reviewsCount = parseInt(product.aggregateRating.reviewCount)   || 0;
                        }
                        if (!snapshot.price && product.offers) {
                            const offerList = Array.isArray(product.offers) ? product.offers : (product.offers.offers || [product.offers]);
                            const offer = offerList[0];
                            if (offer) snapshot.price = parseFloat(offer.price || offer.lowPrice || offer.priceSpecification?.price);
                        }
                       // ─── IMAGE DEBUG (remove after fix) ───
                        if (!snapshot.image) {
    // og:image is most reliable for JioMart fashion — check it first
    const ogImage = $('meta[property="og:image"]').attr('content');
    if (ogImage && ogImage.includes('/images/product/')) {
        snapshot.image = ogImage;
        log('EXTRACT', `Image from og:image: ${ogImage.substring(0, 60)}...`);
    }
}

if (!snapshot.image) {
    snapshot.image =
        $('img#large-image').attr('src') ||
        $('img[src*="jiomart.com/images/product"]').first().attr('src') ||
        $('.product-image-slider img').first().attr('src') ||
        $('[class*="product-image"] img').filter((i, el) => {
            const src = $(el).attr('src') || '';
            return src.includes('/images/product/') && !src.includes('default-image');
        }).first().attr('src');
}

// ─── MRP DEBUG (remove after fix) ───
if (!snapshot.mrp) {
    // Look for strikethrough price elements
    $('[class*="mrp"], [class*="strike"], [class*="original"], s, del, [style*="line-through"]').each((i, el) => {
        if (i < 3) log('DEBUG_MRP', `mrp candidate[${i}] = ${$(el).text().trim()}`);
    });
}
                    }
                } catch(e) {}
            });
        } catch(e) { log('WARN', 'JSON-LD parse failed'); }

        // ─── LAYER 2.5: Inline script flat scan ───
        if (!snapshot.price || isNaN(snapshot.price)) {
            try {
                $('script:not([src])').each((i, el) => {
                    if (snapshot.price && !isNaN(snapshot.price)) return;
                    const content = $(el).html() || '';
                    if (!/price|Price/i.test(content)) return;
                    extractFromFlat(content, snapshot, log, `script[${i}]`);
                });
            } catch(e) { log('WARN', `Inline script scan failed: ${e.message}`); }
        }

        // ─── LAYER 3: Product ID anchored scan ───
        if (productId && (!snapshot.price || isNaN(snapshot.price))) {
            log('EXTRACT', `Using Product ID Anchor: ${productId}`);

            const dataAnchorIdx = (() => {
                let searchFrom = 0;
                while (searchFrom < html.length) {
                    const idx = html.indexOf(productId, searchFrom);
                    if (idx === -1) break;
                    if (html[idx - 1] !== '/' && html[idx + productId.length] !== '/') return idx;
                    searchFrom = idx + 1;
                }
                return -1;
            })();

            if (dataAnchorIdx !== -1) {
                const region = html.substring(Math.max(0, dataAnchorIdx - 100), dataAnchorIdx + 3000);
                extractFromFlat(region, snapshot, log, 'ID-anchor');
            } else {
                log('WARN', 'Product ID not found in data context');
            }

            // Full-page flat scan last resort
            if (!snapshot.price || isNaN(snapshot.price)) {
                log('EXTRACT', 'Firing full-page Flat State Scanner...');
                extractFromFlat(html, snapshot, log, 'flat-scan');
            }
        }

        // ─── LAYER 4: DOM fallbacks ───
        if (!snapshot.name) {
            snapshot.name =
                $('#pdp_product_name').text().trim()  ||
                $('.title-wrapper h1').text().trim()   ||
                $('[class*="product-name"]').first().text().trim() ||
                $('[class*="product_name"]').first().text().trim() ||
                $('h1').first().text().trim()          ||
                $('meta[property="og:title"]').attr('content');
        }

        if (snapshot.brand === "-") {
            const domBrand =
                $('[href*="/c/brand/"]').first().text().trim() ||
                $('.brand-link').text().trim() ||
                $('[class*="brand"]').first().text().trim();
            if (domBrand) {
                snapshot.brand = domBrand;
            } else {
                const m =
                    html.match(/["']brand["']\s*:\s*\{\s*["']name["']\s*:\s*["']([^"'\\]+)["']/i) ||
                    html.match(/["']brandName["']\s*:\s*["']([^"'\\]+)["']/i);
                if (m) snapshot.brand = m[1];
            }
        }

        if (!snapshot.price || isNaN(snapshot.price)) {
            let foundPrice = null;
            const priceSelectors = [
                '#price', '[itemprop="price"]', '.product-price',
                '.jm-heading-xxl', '.jm-heading-xl', '.jm-heading-l',
                '.jm-heading-m', '.jm-heading-s', '.jm-heading-xs',
                '[class*="price"]', '[class*="Price"]', '.price'
            ].join(', ');

            $(priceSelectors).each((i, el) => {
                if (foundPrice) return;
                const text = $(el).text().trim();
                const match = text.match(/(?:₹|Rs\.?|INR)\s*([\d,]+(\.\d+)?)/i) || text.match(/^[\d,]+(\.\d+)?$/);
                if (match) {
                    const parsed = parseFloat((match[1] || match[0]).replace(/,/g, ''));
                    if (parsed > 0) { foundPrice = parsed; return; }
                }
                const digitsOnly = text.replace(/[^\d.]/g, '').trim();
                const parsed = parseFloat(digitsOnly);
                if (parsed > 10) foundPrice = parsed;
            });
            if (foundPrice) {
                snapshot.price = foundPrice;
                log('EXTRACT', `Price from DOM: ${snapshot.price}`);
            }
        }

        if (!snapshot.image) {
            snapshot.image =
                $('img#large-image').attr('src') ||
                $('img[src*="jiomart.com/images/product"]').first().attr('src') ||
                $('.product-image-slider img').first().attr('src') ||
                $('[class*="product-image"] img').first().attr('src') ||
                $('meta[property="og:image"]').attr('content');
        }
    }

    // ─── GATEKEEPER ───
    const missingFields = [];
    if (!snapshot.name)                           missingFields.push('name');
    if (!snapshot.price || isNaN(snapshot.price)) missingFields.push('price');
    if (!snapshot.image)                          missingFields.push('image');

    if (missingFields.length > 0) {
        log('ERROR', `Missing fields: [${missingFields.join(', ')}]`);
        return null;
    }

    if (snapshot.name) snapshot.name = snapshot.name.split('|')[0].replace(/^Buy /i, '').trim();
    log('SUCCESS', `Scraped: ${snapshot.name.substring(0, 30)}... | ₹${snapshot.price} | MRP: ₹${snapshot.mrp} | Brand: ${snapshot.brand}`);

    return {
        name:           snapshot.name,
        price:          parseFloat(String(snapshot.price).replace(/[^\d.]/g, '').replace(/\.$/, '')),
        multiplePrices: null,
        mrp:            snapshot.mrp ? parseFloat(String(snapshot.mrp).replace(/[^\d.]/g, '')) : null,
        currency:       'INR',
        image:          snapshot.image,
        brand:          snapshot.brand !== '-' ? snapshot.brand : null,
        rating:         snapshot.rating ? parseFloat(String(snapshot.rating).match(/[\d.]+/)?.[0]) || null : null,
        reviewsCount:   snapshot.reviewsCount || 0,
        inStock:        snapshot.inStock ?? true,
        status:         snapshot.status || 'active',
        platform:       PLATFORM,
    };
}

// ─── HELPER: Proxy fetcher ───
async function fetchViaProxy(url, accessKey, renderJs, log) {
    const scrapingBeeKey = process.env.SCRAPINGBEE_API_KEY;
    const useScrapingBee = !!scrapingBeeKey;

    const attempts = renderJs === 1 ? [1, 0] : [0];

    for (const js of attempts) {
        let retries = 2;
        while (retries > 0) {
            try {
                log('NETWORK', `Proxy attempt (render_js: ${js}, retries left: ${retries}, provider: ${useScrapingBee ? 'ScrapingBee' : 'Scrapestack'})...`);

                let proxyRes;

                if (useScrapingBee) {
                    proxyRes = await axios.get('https://app.scrapingbee.com/api/v1/', {
                        params: {
                            api_key:   scrapingBeeKey,
                            url:       url,
                            render_js: js === 1 ? 'true' : 'false',
                            ...(js === 1 && {
                                wait:     4000,
                                wait_for: '.jm-heading-xxl,.jm-heading-xl,.product-price,#price,[class*="price"]'
                            })
                        },
                        timeout: js === 1 ? 50000 : 25000
                    });
                } else {
                    proxyRes = await axios.get('http://api.scrapestack.com/scrape', {
                        params: {
                            access_key: accessKey,
                            url:        url,
                            render_js:  js,
                            ...(js === 1 && { wait: 4000 })
                        },
                        timeout: js === 1 ? 50000 : 25000
                    });
                }

                if (proxyRes.data && typeof proxyRes.data === 'string') {
                    log('NETWORK', `Proxy fetch successful (render_js: ${js}, size: ${proxyRes.data.length}).`);
                    return proxyRes.data;
                }
                throw new Error("Invalid proxy response");

            } catch(e) {
                retries--;
                log('NETWORK', `Proxy failed (render_js: ${js}): ${e.message}. Retries left: ${retries}`);
                if (retries === 0) break;
                await new Promise(r => setTimeout(r, 1500));
            }
        }

        const nextJs = attempts[attempts.indexOf(js) + 1];
        if (nextJs !== undefined)
            log('NETWORK', `render_js:${js} exhausted, trying render_js:${nextJs}...`);
    }

    log('NETWORK', 'All proxy attempts exhausted.');
    return null;
}

// ─── HELPER: Extract fields from any flat string ───
function extractFromFlat(flat, snapshot, log, source) {
    if (!snapshot.price || isNaN(snapshot.price)) {
        const m = flat.match(/["'](?:finalPrice|offerPrice|sellingPrice|discountedPrice|salePrice|specialPrice|storePrice|sp)["']\s*:\s*["']?([\d,]+(?:\.\d+)?)/i);
        if (m) {
            snapshot.price = parseFloat(m[1].replace(/,/g, ''));
            if (snapshot.price > 0) log('EXTRACT', `Price from ${source}: ${snapshot.price}`);
            else snapshot.price = null;
        }
    }

    // Separate fallback for generic "price" key — runs only if above missed
    if (!snapshot.price || isNaN(snapshot.price)) {
        const m = flat.match(/["']price["']\s*:\s*["']?([\d,]+(?:\.\d+)?)/i);
        if (m) {
            const val = parseFloat(m[1].replace(/,/g, ''));
            if (val > 10) { snapshot.price = val; log('EXTRACT', `Price (generic key) from ${source}: ${snapshot.price}`); }
        }
    }

    if (!snapshot.mrp || isNaN(snapshot.mrp)) {
        const m = flat.match(/["'](?:mrp|maxPrice|originalPrice|strikePrice|listPrice)["']\s*:\s*["']?([\d,]+(?:\.\d+)?)/i);
        if (m) snapshot.mrp = parseFloat(m[1].replace(/,/g, ''));
    }

    if (!snapshot.name) {
        const m = flat.match(/["'](?:productName|product_name|name|title)["']\s*:\s*["']([^"']{5,200})["']/i);
        if (m && !/http|window|function/i.test(m[1])) snapshot.name = m[1];
    }

    if (!snapshot.rating) {
        const m = flat.match(/["'](?:avgRating|ratingValue|rating)["']\s*:\s*([\d.]+)/i);
        if (m) snapshot.rating = parseFloat(m[1]);
    }

    if (!snapshot.reviewsCount) {
        const m = flat.match(/["'](?:reviewCount|totalReviews|noOfRatings|ratingsCount)["']\s*:\s*(\d+)/i);
        if (m) snapshot.reviewsCount = parseInt(m[1]);
    }

    if (!snapshot.image) {
        const m = flat.match(/["'](?:image|imageUrl|thumbnail|productImage|image_url)["']\s*:\s*["'](https?:\/\/[^"']+\.(?:jpg|jpeg|png|webp)[^"']*)["']/i);
        if (m) snapshot.image = m[1];
    }
}

module.exports = scrapJioMart;