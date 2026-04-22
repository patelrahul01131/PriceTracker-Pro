const axios = require('axios');
const cheerio = require('cheerio');

async function ajio(url) {
    const ACCESS_KEY = process.env.SCRAPINGBOT_API_KEY; 
    const SCRAPESTACK_ENDPOINT = 'http://api.scrapestack.com/scrape';

    console.log(`🚀 [Ajio] Extracting Pure Product Name: ${url}`);

    try {
        const response = await axios.get(SCRAPESTACK_ENDPOINT, {
            params: {
                access_key: ACCESS_KEY,
                url: url,
                render_js: 0,      
                premium_proxy: 0    
            },
            timeout: 40000 
        });

        const html = response.data;
        if (typeof html !== 'string') return null;

        const $ = cheerio.load(html);
        
        let result = {
            name: null,
            price: null,
            image: null,
            platform: "Ajio",
            brand: "-",
            rating: 0,
            currency: 'INR',
            status: "active",
            method: null
        };

        // --- 1. THE PURE DATA SCAN (Highest Priority) ---
        // We look for the raw JSON state where Ajio stores the clean product name
        if (html.includes('window.__PRELOADED_STATE__')) {
            try {
                const jsonStr = html.split('window.__PRELOADED_STATE__ = ')[1].split(';')[0];
                const state = JSON.parse(jsonStr);
                const product = state?.product?.productDetails;
                
                if (product) {
                    result.name = product.name; // Gives: "Set of 2 Quilted Rectangular Pillows"
                    result.brand = product.brandName || "-";
                    result.price = product.price?.value || product.price?.maxPrice;
                    result.image = product.baseImageUrl || product.images?.[0]?.url;
                    result.method = 'internal-state';
                }
            } catch (e) {
                console.log("⚠️ State extraction failed, trying fallbacks...");
            }
        }

        // --- 2. FALLBACK NAME CLEANING ---
        // If we must use Meta Tags, we strip the "Buy " and " online at AJIO" parts
        if (!result.name) {
            let metaName = $('meta[property="og:title"]').attr('content') || $('title').text();
            if (metaName) {
                // Remove common Ajio marketing text using Regex
                result.name = metaName
                    .replace(/^Buy\s+/i, '')                // Remove "Buy " at the start
                    .split('|')[0]                          // Remove anything after "|"
                    .split('-')[0]                          // Remove anything after "-"
                    .replace(/\s+online\s+at\s+AJIO.*$/i, '') // Remove " online at AJIO..."
                    .trim();
                result.method = result.method || 'cleaned-meta-tags';
            }
        }

        // --- 3. PRICE & IMAGE FALLBACKS ---
        if (!result.price) {
            const priceRegex = /"value"\s*:\s*(\d+)/i;
            const pMatch = html.match(priceRegex) || html.match(/"price"\s*:\s*(\d+)/i);
            if (pMatch) result.price = parseFloat(pMatch[1]);
        }

        if (!result.image) {
            result.image = $('meta[property="og:image"]').attr('content');
        }

        // --- FINAL VALIDATION ---
        if (result.price && result.name) {
            console.log(`✅ [Ajio] Success: ${result.name} | ₹${result.price}`);
            return result;
        }

        console.error("❌ [Ajio] Could not capture product details.");
        return null;

    } catch (error) {
        console.error('❌ [Ajio API Error]:', error.message);
        return null;
    }
}

module.exports = ajio;