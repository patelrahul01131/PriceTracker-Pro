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
        } catch (e) {
            // 2. PROXY FALLBACK
            const proxy = await axios.get(SCRAPESTACK_ENDPOINT, {
                params: { access_key: ACCESS_KEY, url: url, render_js: 0 },
                timeout: 25000
            });
            html = proxy.data;
        }

        if (!html || typeof html !== 'string') return null;
        const $ = cheerio.load(html);

        let result = {
            name: null, price: null, image: null,
            platform, brand: "-", rating: 0,
            status: "active", currency: "INR"
        };

        // ─── A. THE "JSON-LD" MASTER EXTRACTION (Most Accurate for Brand/Rating) ───
        $('script[type="application/ld+json"]').each((i, el) => {
    try {
        const rawContent = $(el).html()?.trim();
        if (!rawContent) return;

        const json = JSON.parse(rawContent);
        const items = Array.isArray(json) ? json : [json];

        // ─── 1. FIND THE PRODUCT OBJECT ───
        const product = items.find(x => 
            x['@type'] === 'Product' || 
            (Array.isArray(x['@type']) && x['@type'].includes('Product'))
        );

        // If this specific block is a BreadcrumbList, skip it and go to the next <script>
        if (!product) return; 

        console.log("✅ Found Product JSON-LD block!");

        // ─── 2. EXTRACT ACCURATE DATA ───
        result.name = result.name || product.name;
        
        // Brand Extraction
        if (product.brand) {
            result.brand = typeof product.brand === 'object' ? product.brand.name : product.brand;
        }

        // Rating Extraction
        if (product.aggregateRating) {
            result.rating = parseFloat(product.aggregateRating.ratingValue) || 0;
            result.reviewsCount = parseInt(product.aggregateRating.reviewCount) || 0;
        }

        // Price Extraction
        if (product.offers) {
            const offer = Array.isArray(product.offers) ? product.offers[0] : product.offers;
            // Zepto/Amazon/Flipkart fallback for price
            result.price = parseFloat(offer.price || offer.lowPrice || offer.priceSpecification?.price);
            result.currency = offer.priceCurrency || "INR";
            result.inStock = offer.availability?.includes('InStock') ? "true" : "false";
        }

    } catch (e) {
        // This ignores the "Unexpected end of JSON" error for malformed non-product scripts
    }
});

        // ─── B. NAME & IMAGE FALLBACKS ───
        if (!result.name) {
            result.name = $('#productTitle').text().trim() || $('.VU-ZEz').text().trim() || $('h1').first().text().trim();
        }

        if (!result.image) {
            // Amazon High-Res Fix
            const amzImg = $('#landingImage').attr('data-a-dynamic-image');
            result.image = amzImg ? Object.keys(JSON.parse(amzImg))[0] : ($('meta[property="og:image"]').attr('content') || $('img[src*="rukminim"]').attr('src'));
        }

        // ─── C. BRAND & RATING FALLBACKS (CSS Specifics) ───
        if (result.brand === "-") {
            result.brand = 
                $('#bylineInfo').text().replace(/Visit the | Store/g, '').trim() || // Amazon
                $('.G6XhRU').text().trim() || // Flipkart
                $('meta[name="product:brand"]').attr('content') || "-";
        }

        if (result.rating === 0) {
            const ratingText = 
                $('#acrPopover').attr('title') || // Amazon
                $('.XQDdHH').first().text() ||   // Flipkart
                $('span[data-test-id="rating-value"]').text(); // Generic
            result.rating = parseFloat(ratingText) || 0;
        }

        // ─── D. PRICE FALLBACKS ───
        if (!result.price) {
            const pText = $('.a-price-whole').first().text() || $('.Nx9bqj').first().text() || $('.pdp-price').first().text();
            result.price = parseFloat(pText.replace(/[^\d.]/g, ''));
        }

        // ─── E. CLEANUP ───
        if (result.name) result.name = result.name.split('|')[0].split('(')[0].trim();
        if (result.image?.startsWith('//')) result.image = 'https:' + result.image;

        // FINAL GATEKEEPER
        if (result.price && result.name && result.image) {
            console.log(`✅ [${platform}] Brand: ${result.brand} | Rating: ${result.rating}`);
            return result;
        }

        return null;
    } catch (error) {
        console.error(`❌ Global Scraper Error: ${error}`);
        return null;
    }
}

module.exports = scrap;