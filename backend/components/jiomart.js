const axios = require('axios');
const cheerio = require('cheerio');

/**
 * Scraper for JioMart.com
 * Uses updated selectors found via live browser inspection.
 */
async function scrapJioMart(url) {
    const PLATFORM = "JioMart";
    const ACCESS_KEY = process.env.SCRAPINGBOT_API_KEY;
    const log = (phase, msg) => console.log(`[${PLATFORM}] [${phase}] ${msg}`);
    
    let snapshot = { 
        name: null, 
        price: null, 
        image: null, 
        brand: "-", 
        rating: 0, 
        status: "active", 
        inStock: true,
        platform: PLATFORM,
        currency: "INR"
    };

    try {
        let html;
        log('NETWORK', `Fetching: ${url}`);

        try {
            // JioMart is very aggressive. Let's try proxy first for consistency.
            const proxy = await axios.get('http://api.scrapestack.com/scrape', {
                params: { access_key: ACCESS_KEY, url: url, render_js: 0 },
                timeout: 30000
            });
            html = proxy.data;
            log('NETWORK', 'Proxy fetch successful.');
        } catch (e) {
            log('NETWORK', `Proxy failed (${e.message}). Trying direct fetch with headers...`);
            const direct = await axios.get(url, {
                headers: { 
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
                    'Accept-Language': 'en-US,en;q=0.9'
                },
                timeout: 10000
            });
            html = direct.data;
            log('NETWORK', 'Direct fetch successful.');
        }

        if (!html || typeof html !== 'string') {
            return { success: false, errorType: "NETWORK_ERROR", message: "Empty HTML", platform: PLATFORM };
        }

        const $ = cheerio.load(html);

        // --- Method 1: INITIAL_STATE Extraction ---
        const stateScript = $('script:contains("window.INITIAL_STATE")').html();
        if (stateScript) {
            try {
                // Extract JSON between window.INITIAL_STATE = and ;
                const jsonStr = stateScript.match(/window\.INITIAL_STATE\s*=\s*({.*?});/s)?.[1];
                if (jsonStr) {
                    const state = JSON.parse(jsonStr);
                    const product = state.product?.productDetails || state.product;
                    if (product) {
                        snapshot.name = product.name || product.product_name;
                        snapshot.brand = product.brand_name || product.brand || "-";
                        snapshot.price = parseFloat(product.final_price || product.selling_price);
                        snapshot.image = product.image_url || product.primary_image;
                        snapshot.inStock = product.in_stock !== false;
                        if (!snapshot.inStock) snapshot.status = "out_of_stock";
                    }
                }
            } catch (e) {
                log('PARSE', `Initial State Parse Error: ${e.message}`);
            }
        }

        // --- Method 2: Updated DOM Selectors ---
        if (!snapshot.name) snapshot.name = $('.product-header-name').text().trim() || $('#pdp_product_name').text().trim();
        if (!snapshot.brand || snapshot.brand === "-") snapshot.brand = $('.product-header-brand-name').text().trim() || '-';
        
        if (!snapshot.price) {
            const priceText = $('#final_price').text().trim() || $('.jm-heading-xs').first().text().trim();
            const m = priceText.match(/[\d,]+(?:\.\d+)?/);
            if (m) snapshot.price = parseFloat(m[0].replace(/,/g, ''));
        }

        if (!snapshot.image) {
            snapshot.image = $('.product-image-main-section img').first().attr('src') || $('img#large-image').attr('src');
        }

        // --- Out of Stock Detection ---
        if (html.toLowerCase().includes('out of stock') || html.toLowerCase().includes('not available')) {
            snapshot.inStock = false;
            snapshot.status = "out_of_stock";
        }

        // --- Validation ---
        if (!snapshot.name || !snapshot.price || isNaN(snapshot.price)) {
            // One last attempt: Check JSON-LD
            $('script[type="application/ld+json"]').each((i, el) => {
                try {
                    const json = JSON.parse($(el).html());
                    if (json['@type'] === 'Product') {
                        snapshot.name = snapshot.name || json.name;
                        snapshot.image = snapshot.image || json.image;
                        if (json.offers) {
                            snapshot.price = snapshot.price || parseFloat(json.offers.price || json.offers.lowPrice);
                        }
                    }
                } catch (e) {}
            });
        }

        if (!snapshot.name || !snapshot.price || isNaN(snapshot.price)) {
            return { success: false, errorType: "VALIDATION_ERROR", message: "Missing crucial data", platform: PLATFORM, data: snapshot };
        }

        log('SUCCESS', `${snapshot.name.substring(0, 30)}... | ₹${snapshot.price}`);
        return { success: true, ...snapshot };

    } catch (error) {
        log('FATAL', error.message);
        return { success: false, errorType: "FATAL_ERROR", message: error.message, platform: PLATFORM };
    }
}

module.exports = scrapJioMart;