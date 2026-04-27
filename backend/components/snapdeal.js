const axios = require('axios');
const cheerio = require('cheerio');

async function scrapSnapdeal(url) {
    try {
        let html;
        try {
            const direct = await axios.get(url, { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }, timeout: 6000 });
            html = direct.data;
        } catch (e) {
            const proxy = await axios.get('http://api.scrapestack.com/scrape', { params: { access_key: process.env.SCRAPINGBOT_API_KEY, url: url, render_js: 0 }, timeout: 25000 });
            html = proxy.data;
        }

        if (!html || typeof html !== 'string') return null;
        const $ = cheerio.load(html);

        let result = { name: null, price: null, image: null, platform: "Snapdeal", brand: "-", rating: 0, status: "active", currency: "INR", inStock: true };

        if ($('.sold-out-err').length > 0) {
            result.inStock = false; result.status = "out_of_stock";
        }

        result.name = $('h1[itemprop="name"]').text().trim();
        
        // Snapdeal stores brand in a hidden input
        let rawBrand = $('#brandName').val() || $('.product-brand').text().trim() || "-";
        result.brand = rawBrand.replace(/^brand\s*[:\-]?\s*/i, '').trim();

        const sdPrice = $('.payBlkBig').text().trim();
        if (sdPrice) result.price = parseFloat(sdPrice.replace(/,/g, ''));

        result.image = $('.cloudzoom').attr('src') || $('#bx-slider-left-image-panel img').first().attr('src');
        result.rating = parseFloat($('span[itemprop="ratingValue"]').text()) || 0;

        if (!result.name || !result.price || !result.image) return { error: true, message: "Missing crucial data", platform: "Snapdeal" };
        return result;

    } catch (error) {
        return { error: true, message: error.message, platform: "Snapdeal" };
    }
}
module.exports = scrapSnapdeal;