const axios = require('axios');
const cheerio = require('cheerio');

async function scrap(url, lastKnownPrice = null) {
    const ACCESS_KEY = process.env.SCRAPINGBOT_API_KEY; 
    const SCRAPESTACK_ENDPOINT = 'http://api.scrapestack.com/scrape';

    let platform = "Unknown";
    if (url.includes('amazon')) platform = "Amazon";
    else if (url.includes('flipkart')) platform = "Flipkart";
    else if (url.includes('zepto')) platform = "Zepto";
    else if (url.includes('blinkit')) platform = "Blinkit";
    else if (url.includes('nykaa')) platform = "Nykaa";
    else if (url.includes('tatacliq')) platform = "Tata CLiQ";
    else if (url.includes('meesho')) platform = "Meesho";
    else if (url.includes('jiomart')) platform = "JioMart";
    else if (url.includes('bigbasket')) platform = "BigBasket";
    else if (url.includes('snapdeal')) platform = "Snapdeal";
    else if (url.includes('mi.com')) platform = "Xiaomi";

    // ─── 0. URL GATEKEEPER ───
    if (url.match(/\/(c|category|s|search)\/|\/c-[a-zA-Z0-9]+/i) && !url.includes('/p-') && !url.includes('/pd/') && platform !== "Xiaomi") {
        return { error: true, message: "Category/Search URL detected. Scraper requires a single Product URL.", platform };
    }

    try {
        let html;
        
        // ─── 1. FAST DIRECT FETCH ───
        try {
            const direct = await axios.get(url, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
                    'Accept-Language': 'en-US,en;q=0.9',
                    'Referer': 'https://www.google.com/'
                },
                timeout: 6000 
            });
            html = direct.data;
            console.log(`⚡ [${platform}] Direct fetch successful.`);
        } catch (e) {
            console.log(`⚠️ [${platform}] Direct fetch blocked/failed. Falling back to proxy...`);
            
            // ─── 2. PROXY FALLBACK ───
            try {
                const proxy = await axios.get(SCRAPESTACK_ENDPOINT, {
                    params: { access_key: ACCESS_KEY, url: url, render_js: 0 },
                    timeout: 25000
                });
                html = proxy.data;
                console.log(`🛡️ [${platform}] Proxy fetch successful.`);
            } catch (proxyError) {
                return { error: true, message: `Network Failure: ${proxyError.message}`, platform };
            }
        }

        if (!html || typeof html !== 'string') return { error: true, message: "Empty HTML response", platform };

        // 🚀 THE CLEANER: Decode React/NextJS/Vue strings & HTML entities
        const cleanHtmlStr = html.replace(/\\"/g, '"').replace(/\\n/g, '').replace(/\\\//g, '/').replace(/&quot;/g, '"');
        const $ = cheerio.load(cleanHtmlStr);

        let result = {
            name: null, price: null, image: null,
            platform, brand: "-", rating: 0, reviewsCount: 0,
            status: "active", currency: "INR", inStock: true
        };

        // 🛑 PRECISE OUT OF STOCK HANDLER 
        const oosFlags = $('.sold-out, .out-of-stock, [data-qa="outOfStock"]').length > 0 || 
                         cleanHtmlStr.includes('"availability":"OutOfStock"') || 
                         cleanHtmlStr.match(/["']inStock["']\s*:\s*false/i) ||
                         cleanHtmlStr.match(/["']stock_status["']\s*:\s*["']outofstock["']/i);
        
        if (oosFlags) {
            result.inStock = false;
            result.status = "out_of_stock";
        }

        // ─── A. THE "JSON-LD" MASTER EXTRACTION ───
        $('script[type="application/ld+json"]').each((i, el) => {
            try {
                const rawContent = $(el).html()?.trim();
                if (!rawContent) return;
                const json = JSON.parse(rawContent);
                let items = json['@graph'] ? json['@graph'] : (Array.isArray(json) ? json : [json]);

                const product = items.find(x => x['@type'] === 'Product' || (Array.isArray(x['@type']) && x['@type'].includes('Product')));
                if (!product) return; 

                result.name = result.name || product.name;
                if (product.brand) result.brand = typeof product.brand === 'object' ? (product.brand.name || "-") : product.brand;
                if (product.aggregateRating) result.rating = parseFloat(product.aggregateRating.ratingValue) || 0;
                
                if (product.offers) {
                    const offer = Array.isArray(product.offers) ? product.offers[0] : product.offers;
                    result.price = parseFloat(offer.price || offer.lowPrice || offer.priceSpecification?.price) || result.price;
                    if (offer.availability?.includes('InStock')) result.inStock = true;
                }
                if (product.image) result.image = typeof product.image === 'object' ? (product.image.url || product.image[0]) : product.image;
            } catch (e) {}
        });

        // ─── B. PLATFORM-SPECIFIC DOM SURGERY ───
        
        if (platform === "JioMart") {
            result.name = result.name || $('#pdp_product_name').text().trim() || $('.title-wrapper h1').text().trim();
            const jioPrice = $('#price').text().trim() || $('.jm-heading-xs').first().text().trim() || $('.jm-body-s-bold').first().text().trim() || $('.product-price').first().text().trim();
            if (jioPrice) {
                const match = jioPrice.match(/[\d,]+(\.\d+)?/); 
                if (match) result.price = parseFloat(match[0].replace(/,/g, ''));
            }
            result.brand = result.brand === "-" ? ($('[href*="/c/brand/"]').first().text().trim() || $('.brand-link').text().trim() || "-") : result.brand;
            result.image = result.image || $('img#large-image').attr('src') || $('img[src*="jiomart.com/images/product"]').first().attr('src') || $('.product-image-slider img').first().attr('src');
        }

        if (platform === "BigBasket") {
            result.name = result.name || $('h1').text().trim() || $('.Description___StyledH3-sc-82a36a-2').text().trim();
            result.brand = result.brand === "-" ? ($('a[href*="/pc/"]').first().text().trim() || $('h1').parent().find('span').first().text().trim() || "-") : result.brand;
            const bbPrice = $('td[data-qa="productPrice"]').text().trim() || $('.Pricing___Styleddiv-sc-pdl1tb-0').text().trim() || $('span:contains("₹")').first().text().trim();
            if (bbPrice) {
                const match = bbPrice.match(/[\d,]+(\.\d+)?/);
                if (match) result.price = parseFloat(match[0].replace(/,/g, ''));
            }
            result.image = result.image || $('img[src*="bigbasket.com/media/uploads/p/l/"]').first().attr('src') || $('[data-qa="product-image"] img').first().attr('src');
        }

        if (platform === "Snapdeal") {
            result.name = result.name || $('h1[itemprop="name"]').text().trim();
            result.brand = result.brand === "-" ? ($('#brandName').val() || $('.product-brand').text().trim() || "-") : result.brand;
            result.price = result.price || parseFloat($('.payBlkBig').text().replace(/,/g, ''));
            result.image = result.image || $('.cloudzoom').attr('src') || $('#bx-slider-left-image-panel img').first().attr('src');
            result.rating = result.rating || parseFloat($('span[itemprop="ratingValue"]').text()) || 0;
        }

        if (platform === "Xiaomi") {
            result.name = result.name || $('meta[property="og:title"]').attr('content');
            result.image = result.image || $('meta[property="og:image"]').attr('content');
            const miPrice = $('.price-value').first().text() || $('.selling-price').first().text();
            if (miPrice) {
                const match = miPrice.match(/[\d,]+(\.\d+)?/);
                if (match) result.price = parseFloat(match[0].replace(/,/g, ''));
            }
        }

        // ─── C. UNIVERSAL DOM FALLBACKS ───
        if (!result.name) result.name = $('meta[property="og:title"]').attr('content') || $('h1').first().text().trim() || $('title').first().text().split('|')[0].trim();
        
        if (!result.image) {
            const amzImg = $('#landingImage').attr('data-a-dynamic-image');
            result.image = amzImg ? Object.keys(JSON.parse(amzImg))[0] : ($('meta[property="og:image"]').attr('content') || $('.woocommerce-product-gallery__image img').first().attr('src') || $('img[src*="rukminim"]').attr('src'));
        }

        if (result.brand === "-") {
            result.brand = $('meta[property="product:brand"]').attr('content') || $('#bylineInfo').text().replace(/Visit the | Store/g, '').trim() || $('.G6XhRU').text().trim() || "-";
            if (result.brand.toLowerCase().includes(platform.toLowerCase())) result.brand = "-"; 
        }

        if (!result.price || isNaN(result.price)) {
            const pText = $('.a-price-whole').first().text() || $('.Nx9bqj').first().text() || $('.css-1jczs19').first().text() || $('.price--sale').first().text();
            if (pText) {
                const match = pText.match(/[\d,]+(\.\d+)?/);
                if (match) result.price = parseFloat(match[0].replace(/,/g, ''));
            }
        }

        // ─── D. SPA DEEP STATE REGEX ───
        const lowerNameStr = (result.name || "").toLowerCase();
        if (lowerNameStr.includes('online shopping') || lowerNameStr.includes('tata cliq') || lowerNameStr.includes('blinkit')) result.name = null;

        if (!result.name) {
            const nameMatch = cleanHtmlStr.match(/["'](?:productName|productTitle|name)["']\s*:\s*["']([^"'\\]{5,150})["']/i);
            if (nameMatch && !nameMatch[1].toLowerCase().includes(platform.toLowerCase())) {
                result.name = nameMatch[1];
            } else {
                const slugMatch = url.match(/\/(?:p|product)\/([^\/?]+)/i) || url.match(/\.com\/([^\/?]+)\/p-/i) || url.match(/\.com\/in\/product\/([^\/?]+)/i);
                if (slugMatch) result.name = slugMatch[1].replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
            }
        }

        if (result.brand === "-") {
            // Broadened brand match to catch nested objects
            const brandMatch = cleanHtmlStr.match(/["'](?:brandName|brand)["']\s*:\s*["']([^"'\\]{2,50})["']/i) || 
                               cleanHtmlStr.match(/["']brand["']\s*:\s*\{\s*["'](?:name|brandName)["']\s*:\s*["']([^"'\\]{2,50})["']/i) || 
                               cleanHtmlStr.match(/["']supplier_name["']\s*:\s*["']([^"'\\]{2,50})["']/i);
            if (brandMatch) result.brand = brandMatch[1];
        }

        if (!result.price || isNaN(result.price)) {

            // ✅ collect ALL price candidates with confidence scores
            const candidates = [];

            // high confidence — explicit price keys in JSON
            const highConfPatterns = [
                { pattern: /["'](?:sellingPrice|salePrice|discountedPrice|offerPrice|finalPrice|currentPrice)["']\s*:\s*["']?([\d,]+(?:\.\d+)?)["']?/gi, score: 10 },
                { pattern: /["'](?:selling_price|offer_price|final_price|current_price)["']\s*:\s*["']?([\d,]+(?:\.\d+)?)["']?/gi, score: 10 },
                { pattern: /"price"\s*:\s*\{[\s\S]{0,250}?"(?:value|amount)"\s*:\s*([\d.]+)/gi, score: 9 },
                { pattern: /["'](?:price_min|price|sp|amount)["']\s*:\s*["']?([\d,]+(?:\.\d+)?)["']?/gi, score: 7 },
                { pattern: /["'](?:mrp|regularPrice|listPrice|market_price)["']\s*:\s*["']?([\d,]+(?:\.\d+)?)["']?/gi, score: 5 },
            ];

            // low confidence — raw ₹ symbols in HTML
            const lowConfPatterns = [
                { pattern: /₹\s*([\d,]+(?:\.\d+)?)/g, score: 3 },
                { pattern: /Rs\.?\s*([\d,]+(?:\.\d+)?)/gi, score: 2 },
                { pattern: /INR\s*([\d,]+(?:\.\d+)?)/gi, score: 2 },
            ];

            [...highConfPatterns, ...lowConfPatterns].forEach(({ pattern, score }) => {
                const matches = [...cleanHtmlStr.matchAll(pattern)];
                matches.forEach(m => {
                    const val = parseFloat(m[1].replace(/,/g, ''));
                    // ✅ sanity range — ignore prices outside realistic product range
                    if (val >= 99 && val <= 999999) {
                        candidates.push({ price: val, score });
                    }
                });
            });

            if (candidates.length > 0) {
                // ✅ group by price value — most frequently occurring + highest score wins
                const freq = {};
                candidates.forEach(({ price, score }) => {
                    const key = Math.round(price); // group nearby values (19999 vs 19999.00)
                    if (!freq[key]) freq[key] = { price, score: 0, count: 0 };
                    freq[key].score += score;
                    freq[key].count += 1;
                });

                // sort by (score * count) descending
                const sorted = Object.values(freq).sort((a, b) => (b.score * b.count) - (a.score * a.count));

                console.log('💰 Price candidates:', sorted.slice(0, 5).map(c => `₹${c.price}(score:${c.score},freq:${c.count})`).join(', '));
                
                if (lastKnownPrice != null && sorted.length > 1) {
                    let closest = sorted[0];
                    let minDiff = Infinity;
                    for (const c of sorted) {
                        const diff = Math.abs(c.price - lastKnownPrice);
                        if (diff < minDiff) {
                            minDiff = diff;
                            closest = c;
                        }
                    }
                    result.price = closest.price;
                    console.log(`🎯 Picked closest to lastKnownPrice (₹${lastKnownPrice}): ₹${result.price}`);
                } else {
                    result.price = sorted[0].price;
                }
                
                if (sorted.length > 1) {
                    result.multiplePrices = sorted.map(c => c.price);
                }
            }
        }

        // 🚀 SUPERCHARGED BIGBASKET IMAGE SCAN
     if (!result.image) {
    const BAD = ['favicon', 'logo', 'icon', 'placeholder', 'sprite', 'banner', 'bg', 'background', 'arrow', 'star', 'rating', 'payment', 'brand'];
    const GOOD = ['product', 'item', 'p/', '/pd/', 'image', 'photo', 'media', 'upload', 'cdn', 'img'];

    const imgCandidates = [];

    // meta tags first — highest trust
    [
        $('meta[property="og:image"]').attr('content'),
        $('meta[name="twitter:image"]').attr('content'),
        $('meta[property="product:image"]').attr('content'),
    ].forEach(src => { if (src) imgCandidates.push({ src, score: 10 }); });

    // DOM images
    $('img').each((_, el) => {
        const src = $(el).attr('src') || $(el).attr('data-src') || $(el).attr('data-lazy-src');
        if (!src || src.startsWith('data:')) return;

        let score = 0;
        const lower = src.toLowerCase();

        // penalize bad patterns
        if (BAD.some(b => lower.includes(b))) { score -= 10; return; }

        // reward good patterns
        if (GOOD.some(g => lower.includes(g))) score += 5;

        // reward larger images (width/height attributes)
        const w = parseInt($(el).attr('width') || '0');
        const h = parseInt($(el).attr('height') || '0');
        if (w > 200 || h > 200) score += 5;
        if (w > 400 || h > 400) score += 3;

        // reward images with product-like extensions
        if (/\.(jpg|jpeg|png|webp)/i.test(lower)) score += 2;

        if (score > 0) imgCandidates.push({ src, score });
    });

    // regex fallback on raw HTML for CDN images
    if (imgCandidates.length === 0) {
        const imgMatch = cleanHtmlStr.match(/["'](?:imageUrl|primaryImage|image_url|main_image|cover_image)["']\s*:\s*["'](https?:\/\/[^"']+\.(?:jpg|jpeg|png|webp))["']/i);
        if (imgMatch) imgCandidates.push({ src: imgMatch[1], score: 8 });
    }

    if (imgCandidates.length > 0) {
        imgCandidates.sort((a, b) => b.score - a.score);
        result.image = imgCandidates[0].src;
        console.log('🖼️ Image picked:', result.image?.substring(0, 80), '| score:', imgCandidates[0].score);
    }
    }

        // ─── E. FINAL CLEANUP ───
        if (result.brand) result.brand = result.brand.replace(/^brand\s*[:\-]?\s*/i, '').trim(); 
        if (result.name) result.name = result.name.split('|')[0].split('(')[0].replace(/^Buy /i, '').trim();
        if (result.image && result.image.startsWith('//')) result.image = 'https:' + result.image;

        // ─── F. DIAGNOSTIC GATEKEEPER ───
        let missingFields = [];
        if (!result.name) missingFields.push('name');
        if (!result.price || isNaN(result.price)) missingFields.push('price');
        if (!result.image) missingFields.push('image');

        // ✅ return null on failure instead of { error: true, ... }
        if (missingFields.length > 0) {
            console.error(`\n❌ [${platform}] EXTRACTION FAILED`);
            console.error(`Missing: [${missingFields.join(', ').toUpperCase()}]`);
            console.error(`  Name:  ${result.name || '❌ Null'}`);
            console.error(`  Price: ${result.price || '❌ Null'}`);
            console.error(`  Image: ${result.image || '❌ Null'}`);
            return null; // ✅ controller checks !product
        }

        return {
            name:         result.name,
            price:        parseFloat(String(result.price).replace(/[^\d.]/g, '').replace(/\.$/, '')),
            multiplePrices: result.multiplePrices || null,
            mrp:          result.mrp || null,
            currency:     result.currency || 'INR',
            image:        result.image,
            brand:        result.brand !== '-' ? result.brand : null,
            rating:       result.rating
                            ? parseFloat(String(result.rating).match(/[\d.]+/)?.[0]) || null
                            : null,
            reviewsCount: result.reviewsCount || 0,
            inStock:      result.inStock ?? true,
            status:       result.status || 'active',
            platform,
            category:     result.category     || null,
            description:  result.description  || null,
            features:     result.features     || null,
            discount:     result.discount     || null,
        };

    } catch (error) {
        console.error(`❌ [${platform}] Critical Scraper Error: ${error.stack}`);
        return { error: true, message: error.message, platform };
    }
}

module.exports = scrap;