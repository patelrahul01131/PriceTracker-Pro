const axios = require('axios');
const cheerio = require('cheerio');

async function scrap(url) {
    const ACCESS_KEY = process.env.SCRAPINGBOT_API_KEY; 
    const SCRAPESTACK_ENDPOINT = 'http://api.scrapestack.com/scrape';

    let platform = "Unknown";
    if (url.includes('amazon')) platform = "Amazon";
    else if (url.includes('flipkart')) platform = "Flipkart";
    else if (url.includes('zepto')) platform = "Zepto";
    else if (url.includes('blinkit')) platform = "Blinkit";
    else if (url.includes('nykaa')) platform = "Nykaa";

    try {
        let html;
        // 1. FAST DIRECT FETCH (Human-Mimicry Headers)
        try {
            const direct = await axios.get(url, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
                    'Accept-Language': 'en-US,en;q=0.9',
                    'Referer': 'https://www.google.com/'
                },
                timeout: 6000 // Fast timeout to failover to proxy quickly
            });
            html = direct.data;
            console.log(`⚡ [${platform}] Direct fetch successful.`);
        } catch (e) {
            console.log(`⚠️ [${platform}] Direct fetch blocked/failed (${e.message}). Falling back to proxy...`);
            
            // 2. PROXY FALLBACK
            try {
                const proxy = await axios.get(SCRAPESTACK_ENDPOINT, {
                    params: { access_key: ACCESS_KEY, url: url, render_js: 0 },
                    timeout: 25000
                });
                html = proxy.data;
                console.log(`🛡️ [${platform}] Proxy fetch successful.`);
            } catch (proxyError) {
                console.error(`❌ [${platform}] Proxy fetch also failed: ${proxyError.message}`);
                return { error: true, message: `Network Failure: ${proxyError.message}`, platform };
            }
        }

        if (!html || typeof html !== 'string') {
            console.error(`❌ [${platform}] Received empty or invalid HTML.`);
            return { error: true, message: "Empty HTML response", platform };
        }

        const $ = cheerio.load(html);

let result = {
            name: null, price: null, image: null,
            platform, brand: "-", rating: 0,
            status: "active", currency: "INR"
        };

        // ─── A. THE "JSON-LD" MASTER EXTRACTION ───
        $('script[type="application/ld+json"]').each((i, el) => {
            try {
                const rawContent = $(el).html()?.trim();
                if (!rawContent) return;

                const json = JSON.parse(rawContent);
                
                // 🚀 UPGRADE: Handle deeply nested arrays (Common in WooCommerce/Yoast SEO)
                let items = [];
                if (json['@graph']) items = json['@graph'];
                else if (Array.isArray(json)) items = json;
                else items = [json];

                // ─── 1. FIND THE PRODUCT OBJECT ───
                const product = items.find(x => 
                    x['@type'] === 'Product' || 
                    (Array.isArray(x['@type']) && x['@type'].includes('Product'))
                );

                if (!product) return; 

                // ─── 2. EXTRACT ACCURATE DATA ───
                result.name = result.name || product.name;
                
                if (product.brand) {
                    result.brand = typeof product.brand === 'object' ? (product.brand.name || "-") : product.brand;
                }

                if (product.aggregateRating) {
                    result.rating = parseFloat(product.aggregateRating.ratingValue) || 0;
                    result.reviewsCount = parseInt(product.aggregateRating.reviewCount) || 0;
                }

                if (product.offers) {
                    const offer = Array.isArray(product.offers) ? product.offers[0] : product.offers;
                    result.price = parseFloat(offer.price || offer.lowPrice || offer.priceSpecification?.price) || result.price;
                    result.currency = offer.priceCurrency || "INR";
                    result.inStock = offer.availability?.includes('InStock') ? true : false;
                }

                if (product.image) {
                    result.image = typeof product.image === 'object' ? (product.image.url || product.image[0]) : product.image;
                }

            } catch (e) {
                // Silently ignore malformed JSON-LD blocks
            }
        });

        // ─── B. NAME & IMAGE FALLBACKS (Expanded for Universal Sites) ───
        if (!result.name) {
            result.name = 
                $('#productTitle').text().trim() || 
                $('.VU-ZEz').text().trim() || 
                $('[itemprop="name"]').first().text().trim() || // HTML5 Microdata
                $('.product_title').text().trim() || // WooCommerce
                $('h1').first().text().trim();
        }

        if (!result.image) {
            const amzImg = $('#landingImage').attr('data-a-dynamic-image');
            if (amzImg) {
                result.image = Object.keys(JSON.parse(amzImg))[0];
            } else {
                result.image = 
                    $('meta[property="og:image"]').attr('content') || // Universal Meta
                    $('meta[name="twitter:image"]').attr('content') || 
                    $('[itemprop="image"]').attr('src') || // HTML5 Microdata
                    $('.woocommerce-product-gallery__image img').first().attr('src') || // WooCommerce
                    $('img[src*="rukminim"]').attr('src') || 
                    $('.product-image img').first().attr('src');
            }
        }

        // ─── C. BRAND & RATING FALLBACKS ───
        if (result.brand === "-") {
            result.brand = 
                $('meta[property="product:brand"]').attr('content') || // Generic Meta
                $('meta[property="og:site_name"]').attr('content') || // Shopify/WooCommerce Name
                $('#bylineInfo').text().replace(/Visit the | Store/g, '').trim() || // Amazon
                $('.G6XhRU').text().trim() || // Flipkart
                "-";
        }

        if (result.rating === 0) {
            const ratingText = 
                $('#acrPopover').attr('title') || 
                $('.XQDdHH').first().text() ||   
                $('span[data-test-id="rating-value"]').text(); 
            result.rating = parseFloat(ratingText) || 0;
        }

        // ─── D. PRICE FALLBACKS (Critical Upgrade for Broad Support) ───
        if (!result.price || isNaN(result.price)) {
            // 1. Try Meta Tags First (Most accurate for Shopify/WooCommerce)
            let metaPrice = $('meta[property="product:price:amount"]').attr('content') || 
                            $('meta[name="twitter:data1"]').attr('content');
            
            if (metaPrice) {
                result.price = parseFloat(metaPrice.replace(/[^\d.]/g, ''));
            } else {
                // 2. Try Standard DOM Selectors
                const pText = 
                    $('ins .amount').first().text() || // WooCommerce Sale Price (Avoids old crossed-out price)
                    $('[itemprop="price"]').attr('content') || // HTML5 Microdata
                    $('[itemprop="price"]').first().text() || // HTML5 Microdata
                    $('.price .amount').first().text() || // Generic WooCommerce
                    $('.a-price-whole').first().text() || // Amazon
                    $('.Nx9bqj').first().text() || // Flipkart
                    $('.pdp-price').first().text() || // Generic
                    $('.price').first().text(); // Broadest fallback

                if (pText) {
                    // Safe parsing: removes commas first (e.g. "15,999.00" -> 15999)
                    result.price = parseFloat(pText.replace(/,/g, '').replace(/[^\d.]/g, ''));
                }
            }
        }

        // ─── E. CLEANUP ───
        if (result.name) result.name = result.name.split('|')[0].split('(')[0].trim();
        if (result.image && typeof result.image === 'string' && result.image.startsWith('//')) {
            result.image = 'https:' + result.image;
        }

        // ─── F. DETAILED DIAGNOSTIC GATEKEEPER ───
        let missingFields = [];
        if (!result.name) missingFields.push('name');
        if (!result.price || isNaN(result.price)) missingFields.push('price');
        if (!result.image) missingFields.push('image');

        if (missingFields.length > 0) {
            console.error(`\n❌ [${platform}] EXTRACTION FAILED on ${url}`);
            console.error(`Missing crucial data: [${missingFields.join(', ').toUpperCase()}]`);
            console.error(`Current Extraction Snapshot:`);
            console.error(`  - Name:   ${result.name ? '✅ Found' : '❌ Null'}`);
            console.error(`  - Price:  ${result.price ? '✅ Found (' + result.price + ')' : '❌ Null or NaN'}`);
            console.error(`  - Image:  ${result.image ? '✅ Found' : '❌ Null'}`);
            console.error(`  - Brand:  ${result.brand}`);
            
            return { error: true, message: `Missing required fields: ${missingFields.join(', ')}`, platform };
        }

        console.log(`✅ [${platform}] Success -> ${result.name.substring(0, 30)}... | Brand: ${result.brand} | Price: ${result.price} | Rating: ${result.rating}`);
        return result;

    } catch (error) {
        console.error(`❌ [${platform}] Critical Scraper Error: ${error.stack}`);
        return { error: true, message: error.message, platform };
    }
}

module.exports = scrap;