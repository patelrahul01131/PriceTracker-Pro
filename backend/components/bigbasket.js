const axios = require('axios');
const cheerio = require('cheerio');

async function scrapBigBasket(url) {
    const PLATFORM = "BigBasket";
    const ACCESS_KEY = process.env.SCRAPINGBOT_API_KEY; 

    const log = (phase, msg) => console.log(`[${PLATFORM}] [${phase}] ${msg}`);
    let snapshot = { name: null, price: null, image: null, brand: "-", rating: 0, status: "active", inStock: true };

    if (url.match(/\/(c|ps)\//i) && !url.includes('/pd/')) return { success: false, errorType: "BAD_URL", message: "Category URL detected.", platform: PLATFORM };

    try {
        let html;
        log('NETWORK', `Fetching URL: ${url}`);
        
        try {
            const direct = await axios.get(url, { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }, timeout: 6000 });
            const lowerData = direct.data.toLowerCase();
            if (lowerData.includes('cloudflare') || lowerData.includes('just a moment') || lowerData.includes('access denied')) throw new Error("WAF Blocked");
            html = direct.data;
            log('NETWORK', 'Direct fetch successful.');
        } catch (e) {
            log('NETWORK', `Direct failed (${e.message}). Routing to proxy...`);
            try {
                const proxy = await axios.get('http://api.scrapestack.com/scrape', { params: { access_key: ACCESS_KEY, url: url, render_js: 0 }, timeout: 25000 });
                html = proxy.data;
                log('NETWORK', 'Proxy fetch successful.');
            } catch (proxyError) {
                return { success: false, errorType: "NETWORK_ERROR", message: "Proxy Error", platform: PLATFORM };
            }
        }

        if (!html || typeof html !== 'string') return { success: false, errorType: "NETWORK_ERROR", message: "Empty HTML", platform: PLATFORM };

        log('PARSE', 'Parsing HTML structure...');
        const cleanHtmlStr = html.replace(/\\"/g, '"').replace(/\\n/g, '').replace(/\\\//g, '/').replace(/&quot;/g, '"');
        const $ = cheerio.load(cleanHtmlStr);

        if ($('[data-qa="outOfStock"]').length > 0 || cleanHtmlStr.includes('"availability":"OutOfStock"')) {
            snapshot.inStock = false; snapshot.status = "out_of_stock";
        }

        try {
            snapshot.name = $('h1').text().trim() || $('.Description___StyledH3-sc-82a36a-2').text().trim();
            snapshot.brand = $('a[href*="/pc/"]').first().text().trim() || $('h1').parent().find('span').first().text().trim() || "-";
        } catch (e) {}

        try {
            // DOM extraction first
            const bbPrice = $('td[data-qa="productPrice"]').text().trim() || $('.Pricing___Styleddiv-sc-pdl1tb-0').text().trim();
            if (bbPrice) {
                const match = bbPrice.match(/[\d,]+(\.\d+)?/);
                if (match) snapshot.price = parseFloat(match[0].replace(/,/g, ''));
            } 
            // 🚀 THE FIX: Extreme Regex for Proxy Skeletons
            if (!snapshot.price || isNaN(snapshot.price)) {
                const spMatch = cleanHtmlStr.match(/["'](?:sp|selling_price|price)["']\s*:\s*([\d.]+)/i) || cleanHtmlStr.match(/₹\s*([\d.]+)/);
                if (spMatch) snapshot.price = parseFloat(spMatch[1]);
            }
        } catch (e) {}

        try {
            const imgArrayMatch = cleanHtmlStr.match(/["']images["']\s*:\s*\[\s*\{\s*["']s["']\s*:\s*["']([^"'\\]+)["']/i);
            const bbRawImg = cleanHtmlStr.match(/(https?:\/\/[^\s"'<>]+\.bbassets\.com\/media\/uploads\/[^\s"'<>]+\.(?:jpg|jpeg|png|webp))/i);
            if (imgArrayMatch) snapshot.image = imgArrayMatch[1];
            else if (bbRawImg) snapshot.image = bbRawImg[1];
            else snapshot.image = $('[data-qa="product-image"] img').first().attr('src');
        } catch (e) {}

        let missingFields = [];
        if (!snapshot.name) missingFields.push('name');
        if (!snapshot.price || isNaN(snapshot.price)) missingFields.push('price');
        if (!snapshot.image) missingFields.push('image');

        if (missingFields.length > 0) {
            log('ERROR', `Missing fields: [${missingFields.join(', ')}]`);
            return { success: false, errorType: "VALIDATION_ERROR", message: `Missing: [${missingFields.join(', ')}]`, platform: PLATFORM, failedSnapshot: snapshot };
        }

        log('SUCCESS', `Scraped: ${snapshot.name.substring(0, 20)}... | ₹${snapshot.price}`);
        return { success: true, data: snapshot };

    } catch (error) {
        log('FATAL', error.stack);
        return { success: false, errorType: "FATAL_ERROR", message: error.message, platform: PLATFORM };
    }
}
module.exports = scrapBigBasket;