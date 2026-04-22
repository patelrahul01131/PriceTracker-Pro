const axios = require('axios');
const cheerio = require('cheerio');

async function meesho(url, retries = 3) {
    const ACCESS_KEY = process.env.SCRAPINGBOT_API_KEY;
    const SCRAPESTACK_ENDPOINT = 'http://api.scrapestack.com/scrape';

    for (let i = 0; i < retries; i++) {
        try {
            console.log(`🚀 [Meesho] Attempt ${i + 1}: Routing through Scrapestack...`);
            
            const response = await axios.get(SCRAPESTACK_ENDPOINT, {
                params: {
                    access_key: ACCESS_KEY,
                    url: url,
                    render_js: 0,
                    premium_proxy: 0 // Free tier must be 0
                },
                timeout: 40000 
            });

            const html = response.data;
            if (typeof html !== 'string') throw new Error("Invalid HTML response");

            const $ = cheerio.load(html);
            
            // --- DATA EXTRACTION ---
            let extracted = {
                name: $('meta[property="og:title"]').attr('content')?.split('-')[0].trim() || $('h1').text().trim(),
                image: $('meta[property="og:image"]').attr('content') || $('img[alt="product"]').attr('src'),
                platform: "Meesho",
                brand: "Generic", // Default for Meesho
                rating: 0,
                price: null,
            };

            // Price Hunt
            const metaPrice = $('meta[property="product:price:amount"]').attr('content');
            if (metaPrice) {
                extracted.price = parseFloat(metaPrice);
            } else {
                const match = html.match(/"price"\s*:\s*(\d+)/i) || html.match(/₹\s*([\d,]+)/);
                if (match) extracted.price = parseFloat(match[1].replace(/,/g, ''));
            }

            // Rating & Brand Hunt (NextJS State)
            const nextData = $('#__NEXT_DATA__').html();
            if (nextData) {
                try {
                    const state = JSON.parse(nextData);
                    const p = state?.props?.pageProps?.initialState?.product?.productData;
                    if (p) {
                        extracted.rating = p.rating || 0;
                        extracted.brand = p.brand_name || "-";
                    }
                } catch (e) {}
            }

            if (extracted.price) return extracted;
            
        } catch (error) {
            console.error(`⚠️ Attempt ${i + 1} failed: ${error.message}`);
            if (i === retries - 1) return null; // Final failure
            await new Promise(r => setTimeout(r, 2000)); // Wait 2s before retry
        }
    }
}

module.exports = meesho;