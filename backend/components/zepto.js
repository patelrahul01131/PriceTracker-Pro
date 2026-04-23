const cheerio = require('cheerio');
const { CookieJar } = require('tough-cookie');
const fs = require('fs');

// 🚀 got-scraping handles TLS spoofing so Cloudflare doesn't block the API
async function fetchWithCookies(url, jar, options = {}) {
    try {
        const gotScrapingModule = await import('got-scraping');
        const gotScraping = gotScrapingModule.gotScraping || gotScrapingModule.default;

        const response = await gotScraping({
            url: url,
            method: 'GET',
            cookieJar: jar, 
            headers: options.headers || {},
            headerGeneratorOptions: {
                browsers: [ { name: 'chrome' } ],
                devices: ['desktop'],
                operatingSystems: ['windows', 'macos']
            },
            timeout: { request: 15000 },
            retry: { limit: 2 } 
        });

        return {
            status: response.statusCode,
            text: async () => response.body
        };
    } catch (error) {
        throw new Error(`gotScraping Failed: ${error.message}`);
    }
}

async function zepto(productUrl) {
    console.log(`\n🚀 [Zepto] ${productUrl}`);

    const pvidMatch = productUrl.match(/pvid\/([a-f0-9-]+)/i);
    const slugMatch = productUrl.match(/\/pn\/([^/]+)\/pvid/);
    
    if (!pvidMatch || !slugMatch) { 
        console.error('❌ Cannot parse URL PVID or Slug'); 
        return null; 
    }
    
    const pvid = pvidMatch[1];
    const slug = slugMatch[1];

    const jar = new CookieJar();
    
    // 🎯 CRITICAL: Keep these as your exact office/delivery coordinates!
    jar.setCookieSync('lat=23.022505; Domain=.zepto.com; Path=/', 'https://www.zepto.com/');
    jar.setCookieSync('long=72.5713621; Domain=.zepto.com; Path=/', 'https://www.zepto.com/');

    await fetchWithCookies('https://www.zepto.com/', jar);
    await sleep(800, 1500);

    // ── Strategy 1: The Next.js RSC API ──
// ── Strategy 1: The Next.js RSC API (DEBUG MODE) ──
    try {
        console.log(`📡 Requesting Direct RSC Data Stream...`);
        const stateTree = JSON.stringify([
            "", { children: ["(main)", { children: ["pn", { children: ["desktop", { children: [["title", slug, "d"], { children: ["pvid", { children: [[pvid, pvid, "d"], { children: ["__PAGE__", {}] }] }] }] }] }] }] }, null, null, true
        ]);

        const rscUrl = `${productUrl}?_rsc=${randomHex(5)}`;
        const res = await fetchWithCookies(rscUrl, jar, {
            headers: {
                'accept': '*/*',
                'rsc': '1',
                'next-router-state-tree': encodeURIComponent(stateTree),
                'next-url': `/pn/desktop/${slug}/pvid/${pvid}`, 
                'referer': productUrl,
            },
        });

        // 🛑 NEW DIAGNOSTIC LOGGER 🛑
        console.log(`🛠️ [DEBUG] HTTP Status: ${res.status}`);
        const rscData = await res.text();
        
        // Save the raw response to your Innvonix project folder
        fs.writeFileSync('zepto-debug-dump.txt', rscData);
        console.log(`📁 Saved raw response to 'zepto-debug-dump.txt'.`);

        if (res.status === 403 || res.status === 401) {
            console.error(`🚨 CLOUDFLARE BLOCK: Your IP address is temporarily banned.`);
            return null;
        }

        const r = extractExactProduct(rscData, pvid, {}, slug);
        
        if (r && r.price) { 
            console.log(`✅ [RSC API] ${r.name}`);
            console.log(`   💰 Price: ₹${r.price} | MRP: ₹${r.mrp}`);
            return r; 
        }
    } catch (e) { 
        console.warn(`⚠️ [RSC API] Failed: ${e.message}`); 
    }   

    // ── Strategy 2: Direct Page Fallback ──
    try {
        console.log(`📡 Requesting Raw HTML Fallback...`);
        const res = await fetchWithCookies(productUrl, jar, {
            headers: { 'referer': 'https://www.zepto.com/' },
        });

        const html = await res.text();
        const $ = cheerio.load(html);

        let metaTitle = $('meta[property="og:title"]').attr('content') || $('title').text() || "";
        let exactName = metaTitle.replace(/Buy\s+/ig, '').replace(/Online/ig, '').split('|')[0].split('-')[0].trim();
        let exactImage = $('meta[property="og:image"]').attr('content') || null;
        
        const metaData = { name: exactName, image: exactImage };

        const r = extractExactProduct(html, pvid, metaData, slug);
        if (r && r.price) { 
            console.log(`✅ [HTML Fallback] ${r.name}`);
            console.log(`   💰 Price: ₹${r.price} | MRP: ₹${r.mrp}`);
            return r; 
        }
    } catch (e) { 
        console.warn(`⚠️ [HTML Fallback] Failed: ${e.message}`); 
    }

    console.error(`❌ All strategies failed. Product might be Out of Stock at these coordinates.`);
    return null;
}



function extractExactProduct(text, pvid, metaData = {}, slug = "") {
    // 1. Normalize text: Unescape quotes, newlines, and forward slashes
    let cleanText = text.replace(/\\"/g, '"').replace(/\\n/g, '').replace(/\\\//g, '/');

    // 🛑 OUT OF STOCK HANDLER
    if (cleanText.includes('"availableQuantity":0') || cleanText.includes('"outOfStock":true')) {
        return null;
    }

    // 2. EXTRACT EXACT PRICE (Fix for the ₹4-5 margin)
    // We look for the absolute lowest Zepto Pass (ULTRA_SAVER) price first!
    let price = null;
    const ultraSaverMatch = cleanText.match(/"discountedSellingPrice"\s*:\s*(\d+)\s*,\s*"pricingEntity"\s*:\s*"ULTRA_SAVER"/);
    // console.log("Ultra Saver Match :", ultraSaverMatch);
    if (!ultraSaverMatch) {
        price = parseInt(ultraSaverMatch[1]);
    } else {
        // Fallback to standard price if no ULTRA_SAVER exists
        const stdPriceMatch = cleanText.match(/"(?:discountedSellingPrice|sellingPrice)"\s*:\s*(\d+)/);
        if (stdPriceMatch) price = parseInt(stdPriceMatch[1]);
    }

    if (price && price > 1000) price /= 100; 

    // 3. EXTRACT MRP
    const mrpMatch = cleanText.match(/"mrp"\s*:\s*(\d+)/);
    let mrp = mrpMatch ? parseInt(mrpMatch[1]) : price;
    if (mrp && mrp > 1000) mrp /= 100;

    // 4. EXTRACT NAME, BRAND, IMAGE FROM SEO SCHEMA
    // Zepto generates a clean Schema.org object at the very end of the file.
    
    const schemaNameMatch = cleanText.match(/"content"\s*:\s*"([^"]+)"\s*,\s*"itemProp"\s*:\s*"name"/);
    let formattedSlug = slug ? slug.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ') : 'Unknown Product';
    let name = metaData.name || (schemaNameMatch ? schemaNameMatch[1] : formattedSlug);

    const schemaImageMatch = cleanText.match(/"href"\s*:\s*"([^"]+)"\s*,\s*"itemProp"\s*:\s*"image"/);
    let image = metaData.image || (schemaImageMatch ? schemaImageMatch[1] : 'No image found');

    const schemaBrandMatch = cleanText.match(/"itemProp"\s*:\s*"brand".*?"content"\s*:\s*"([^"]+)"/);
    let brand = schemaBrandMatch ? schemaBrandMatch[1] : '-';

    // 5. EXTRACT RATINGS
    const ratingMatch = cleanText.match(/"content"\s*:\s*"([\d.]+)"\s*,\s*"itemProp"\s*:\s*"ratingValue"/);
    let rating = ratingMatch ? parseFloat(ratingMatch[1]) : 0;

    const reviewCountMatch = cleanText.match(/"content"\s*:\s*"(\d+)"\s*,\s*"itemProp"\s*:\s*"reviewCount"/);
    let reviews = reviewCountMatch ? parseInt(reviewCountMatch[1]) : 0;

    return { 
        platform: 'Zepto', 
        name: name, 
        brand: brand, 
        price: price, 
        mrp: mrp,
        rating: rating,
        reviews: reviews,
        image: image,
        status: 'active'
    };
}

const randomHex = n => [...Array(n)].map(() => Math.floor(Math.random() * 16).toString(16)).join('');
const sleep = (min, max) => new Promise(r => setTimeout(r, Math.floor(Math.random() * (max - min + 1)) + min));

module.exports = zepto;