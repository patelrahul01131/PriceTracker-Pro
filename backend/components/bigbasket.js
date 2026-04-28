const axios = require('axios');
const cheerio = require('cheerio');

async function scrapBigBasket(url) {
    const PLATFORM = "BigBasket";
    const ACCESS_KEY = process.env.SCRAPINGBOT_API_KEY; 

    const log = (phase, msg) => console.log(`[${PLATFORM}] [${phase}] ${msg}`);
    let snapshot = { name: null, price: null, image: null, brand: "-", rating: 0, reviewsCount: 0, status: "active", inStock: true };

    if (url.match(/\/(c|ps)\//i) && !url.includes('/pd/')) {
        log('ERROR', "Category URL detected.");
        return null; 
    }

    try {
        let html;
        log('NETWORK', `Fetching URL: ${url}`);
        
        try {
            const direct = await axios.get(url, { 
                headers: { 
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8'
                }, 
                timeout: 6000 
            });
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
                log('ERROR', `Proxy Error: ${proxyError.message}`);
                return null;
            }
        }

        if (!html || typeof html !== 'string') {
            log('ERROR', "Empty HTML");
            return null;
        }

        log('PARSE', 'Parsing HTML structure...');
        const $ = cheerio.load(html);

        if ($('[data-qa="outOfStock"]').length > 0 || html.includes('"availability":"OutOfStock"')) {
            snapshot.inStock = false; snapshot.status = "out_of_stock";
        }

        // 🚀 LAYER 1: JSON-LD Master Extractor
        try {
            $('script[type="application/ld+json"]').each((i, el) => {
                const raw = $(el).html();
                if (raw) {
                    const json = JSON.parse(raw);
                    let items = json['@graph'] ? json['@graph'] : (Array.isArray(json) ? json : [json]);
                    const product = items.find(x => x['@type'] === 'Product' || (Array.isArray(x['@type']) && x['@type'].includes('Product')));
                    if (product) {
                        if (!snapshot.name) snapshot.name = product.name;
                        if (product.brand) snapshot.brand = typeof product.brand === 'object' ? product.brand.name : product.brand;
                        if (product.aggregateRating) {
                            snapshot.rating = parseFloat(product.aggregateRating.ratingValue) || 0;
                            snapshot.reviewsCount = parseInt(product.aggregateRating.reviewCount) || 0;
                        }
                        if (product.offers) {
                            const offer = Array.isArray(product.offers) ? product.offers[0] : product.offers;
                            snapshot.price = parseFloat(offer.price || offer.lowPrice || offer.priceSpecification?.price) || snapshot.price;
                        }
                        if (product.image) snapshot.image = typeof product.image === 'object' ? (product.image.url || product.image[0]) : product.image;
                    }
                }
            });
        } catch (e) { log('WARN', 'JSON-LD parse failed'); }

        // 🚀 LAYER 2: The Ultimate Next.js State Parser
        if (!snapshot.price || !snapshot.name || !snapshot.rating) {
            try {
                const nextDataScript = $('#__NEXT_DATA__').html();
                if (nextDataScript) {
                    const nextData = JSON.parse(nextDataScript);
                    const p = nextData?.props?.pageProps?.initialState?.productDetails || nextData?.props?.pageProps?.productDetails;
                    
                    if (p) {
                        snapshot.name = snapshot.name || p.desc || p.pack_desc || null;
                        snapshot.brand = snapshot.brand === "-" ? (p.brand?.name || "-") : snapshot.brand;
                        
                        // Exact match for BigBasket's internal Selling Price ("sp")
                        const sp = parseFloat(p.pricing?.discount?.sp || p.pricing?.price || p.price);
                        if (sp && !isNaN(sp)) snapshot.price = sp;
                        
                        snapshot.mrp = parseFloat(p.pricing?.discount?.mrp);
                        
                        // Exact match for BigBasket's internal Rating
                        if (!snapshot.rating) snapshot.rating = parseFloat(p.rating_info?.avg_rating) || 0;
                        if (!snapshot.reviewsCount) snapshot.reviewsCount = parseInt(p.rating_info?.review_count) || 0;
                        
                        if (!snapshot.image && p.images && p.images.length > 0) {
                            snapshot.image = p.images[0].l || p.images[0].m || p.images[0].s;
                        }
                    }
                }
            } catch (e) { log('WARN', `NextData parser failed: ${e.message}`); }
        }

        // 🚀 LAYER 3: Strict String Matching (No dangerous generic ₹ searches)
        if (!snapshot.name) snapshot.name = $('h1').text().trim() || $('.Description___StyledH3-sc-82a36a-2').text().trim();

        if (snapshot.brand === "-") {
            const brandMatch = html.match(/["']brand["']\s*:\s*\{\s*["']name["']\s*:\s*["']([^"'\\]+)["']/i);
            snapshot.brand = brandMatch ? brandMatch[1] : ($('a[href*="/b/"]').first().text().trim() || "-");
        }

        // 🎯 THE PRICE FIX: Strictly searches for `"sp": 41` or data-qa attributes. Never grabs random ₹ symbols.
        if (!snapshot.price || isNaN(snapshot.price)) {
            const bbPriceDOM = $('td[data-qa="productPrice"]').text().trim() || $('.Pricing___Styleddiv-sc-pdl1tb-0').text().trim();
            if (bbPriceDOM) {
                const match = bbPriceDOM.match(/[\d,]+(\.\d+)?/);
                if (match) snapshot.price = parseFloat(match[0].replace(/,/g, ''));
            } else {
                const spMatch = html.match(/["']sp["']\s*:\s*"?([\d.]+)"?/i) || html.match(/["']sellingPrice["']\s*:\s*"?([\d.]+)"?/i);
                if (spMatch && parseFloat(spMatch[1]) > 0) snapshot.price = parseFloat(spMatch[1]);
            }
        }

        // 🎯 THE RATING FIX: Strict search for "avg_rating"
        if (!snapshot.rating) {
            const domRating = $('[data-qa="rating-value"]').first().text().trim() || $('[class*="Rating___Styledspan"]').first().text().trim();
            console.log("domRating : ",domRating);
            const rMatch = domRating.match(/([\d.]+)/);
            if (rMatch) snapshot.rating = parseFloat(rMatch[1]);
        }

        if (!snapshot.image) {
            const imgArrayMatch = html.match(/["']images["']\s*:\s*\[\s*\{\s*["']s["']\s*:\s*["']([^"'\\]+)["']/i);
            const bbRawImg = html.match(/(https?:\/\/[^\s"'<>]+\.bbassets\.com\/media\/uploads\/[^\s"'<>]+\.(?:jpg|jpeg|png|webp))/i);
            if (imgArrayMatch) snapshot.image = imgArrayMatch[1];
            else if (bbRawImg) snapshot.image = bbRawImg[1];
            else snapshot.image = $('[data-qa="product-image"] img').first().attr('src');
        }

        // ─── GATEKEEPER ───
        let missingFields = [];
        if (!snapshot.name) missingFields.push('name');
        if (!snapshot.price || isNaN(snapshot.price)) missingFields.push('price');
        if (!snapshot.image) missingFields.push('image');

        if (missingFields.length > 0) {
            log('ERROR', `Missing fields: [${missingFields.join(', ')}]`);
            return null; 
        }

        log('SUCCESS', `Scraped: ${snapshot.name.substring(0, 20)}... | ₹${snapshot.price} | Brand: ${snapshot.brand} | Rating: ${snapshot.rating || 'N/A'}`);
        
        return {
            name:         snapshot.name,
            price:        parseFloat(String(snapshot.price).replace(/[^\d.]/g, '').replace(/\.$/, '')),
            multiplePrices: null,
            mrp:          snapshot.mrp || null,
            currency:     'INR',
            image:        snapshot.image,
            brand:        snapshot.brand !== '-' ? snapshot.brand : null,
            rating:       snapshot.avg_rating ? parseFloat(String(snapshot.avg_rating).match(/[\d.]+/)?.[0]) || null : null,
            reviewsCount: snapshot.review_count || 0,
            inStock:      snapshot.inStock ?? true,
            status:       snapshot.status || 'active',
            platform:     PLATFORM,
        };

    } catch (error) {
        log('FATAL', error.stack);
        return null;
    }
}
module.exports = scrapBigBasket;