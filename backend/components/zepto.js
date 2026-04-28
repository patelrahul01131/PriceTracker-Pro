const cheerio  = require('cheerio');
const { CookieJar } = require('tough-cookie');

// ✅ import ONCE at module level — not inside the function
let _gotScraping = null;
async function getGot() {
    if (!_gotScraping) {
        const m = await import('got-scraping');
        _gotScraping = m.gotScraping || m.default;
    }
    return _gotScraping;
}

// ✅ reusable fetch — no sleep, no homepage warmup
async function fetchPage(url, jar, headers = {}) {
    const gotScraping = await getGot();
    const response = await gotScraping({
        url,
        cookieJar: jar,
        headers,
        headerGeneratorOptions: {
            browsers:         [{ name: 'chrome' }],
            devices:          ['desktop'],
            operatingSystems: ['windows', 'macos'],
        },
        timeout: { request: 10000 }, // ✅ 10s not 15s
        retry:   { limit: 0 },       // ✅ no hidden retries — we control flow
    });
    return response.body;
}

async function zepto(productUrl) {
    console.log(`\n🚀 [Zepto] ${productUrl}`);

    const pvidMatch = productUrl.match(/pvid\/([a-f0-9-]+)/i);
    const slugMatch = productUrl.match(/\/pn\/([^/]+)\/pvid/);

    if (!pvidMatch || !slugMatch) {
        console.error('❌ [Zepto] Cannot parse PVID or Slug');
        return null;
    }

    const pvid = pvidMatch[1];
    console.log('PVID:', pvid);
    const slug = slugMatch[1];

    // ✅ minimal jar — just set coords, skip homepage warmup
    const jar = new CookieJar();
    jar.setCookieSync('lat=23.022505; Domain=.zepto.com; Path=/',  'https://www.zepto.com/');
    jar.setCookieSync('long=72.5713621; Domain=.zepto.com; Path=/', 'https://www.zepto.com/');

    // ✅ run both strategies in parallel — fastest wins
    const rscPromise  = fetchRSC(productUrl, pvid || null, slug, jar);
    const htmlPromise = fetchHTML(productUrl, jar);

    // try RSC first with short timeout, fall back to HTML
    try {
        const rscResult = await Promise.race([
            rscPromise,
            new Promise((_, reject) => setTimeout(() => reject(new Error('RSC timeout')), 8000))
        ]);
        if (rscResult?.price) {
            console.log(`✅ [Zepto RSC] ${rscResult.name} | ₹${rscResult.price}`);
            return rscResult;
        }
    } catch (e) {
        console.warn(`⚠️ [Zepto RSC] ${e.message}`);
    }

    // fallback to HTML
    try {
        const htmlResult = await htmlPromise;
        if (htmlResult?.price) {
            console.log(`✅ [Zepto HTML] ${htmlResult.name} | ₹${htmlResult.price}`);
            return htmlResult;
        }
    } catch (e) {
        console.warn(`⚠️ [Zepto HTML] ${e.message}`);
    }

    console.error('❌ [Zepto] All strategies failed');
    return null;
}

async function fetchRSC(productUrl, pvid, slug, jar) {
    const stateTree = JSON.stringify([
        "", { children: ["(main)", { children: ["pn", { children: ["desktop", { children: [["title", slug, "d"], { children: ["pvid", { children: [[pvid, pvid, "d"], { children: ["__PAGE__", {}] }] }] }] }] }] }] }, null, null, true
    ]);

    const rscUrl  = `${productUrl}?_rsc=${randomHex(5)}`;
    const rscData = await fetchPage(rscUrl, jar, {
        'accept':                   '*/*',
        'rsc':                      '1',
        'next-router-state-tree':   encodeURIComponent(stateTree),
        'next-url':                 `/pn/desktop/${slug}/pvid/${pvid}`,
        'referer':                  productUrl,
    });

    // ✅ removed fs.writeFileSync — was blocking event loop
    return extractExactProduct(rscData, pvid, {}, slug);
}

// ✅ pass pvid and slug as parameters
async function fetchHTML(productUrl, pvid, slug, jar) {
    const html = await fetchPage(productUrl, jar, {
        'referer': 'https://www.zepto.com/'
    });

    const $ = cheerio.load(html);
    const metaTitle = $('meta[property="og:title"]').attr('content') || $('title').text() || '';
    const metaData  = {
        name:  metaTitle.replace(/Buy\s+/ig, '').replace(/Online/ig, '').split('|')[0].split('-')[0].trim(),
        image: $('meta[property="og:image"]').attr('content') || null,
    };

    return extractExactProduct(html, pvid, metaData, slug); // ✅ now in scope
}

function extractExactProduct(text, pvid, metaData = {}, slug = '') {
    const cleanText = text.replace(/\\"/g, '"').replace(/\\n/g, '').replace(/\\\//g, '/');

    if (cleanText.includes('"availableQuantity":0') || cleanText.includes('"outOfStock":true')) {
        return null;
    }

    const storeProductIdx = cleanText.indexOf('"storeProduct"');
    if (storeProductIdx === -1) return null;

    const storeChunk = cleanText.slice(storeProductIdx, storeProductIdx + 1500);

    const priceMatch = storeChunk.match(/"(?:discountedSellingPrice|sellingPrice)"\s*:\s*(\d+)/);
    const mrpMatch   = storeChunk.match(/"mrp"\s*:\s*(\d+)/);

    let price = priceMatch ? parseInt(priceMatch[1]) : null;
    if (price > 1000) price /= 100;

    let mrp = mrpMatch ? parseInt(mrpMatch[1]) : price;
    if (mrp > 1000) mrp /= 100;

    const schemaNameMatch  = cleanText.match(/"content"\s*:\s*"([^"]+)"\s*,\s*"itemProp"\s*:\s*"name"/);
    const schemaBrandMatch = cleanText.match(/"itemProp"\s*:\s*"brand".*?"content"\s*:\s*"([^"]+)"/);
    const schemaImageMatch = cleanText.match(/"href"\s*:\s*"([^"]+)"\s*,\s*"itemProp"\s*:\s*"image"/);
    const rawImageMatch    = cleanText.match(/"path"\s*:\s*"(cms\/product_variant\/[^"]+)"/);
    const ratingMatch      = cleanText.match(/"content"\s*:\s*"([\d.]+)"\s*,\s*"itemProp"\s*:\s*"ratingValue"/);
    const reviewMatch      = cleanText.match(/"content"\s*:\s*"(\d+)"\s*,\s*"itemProp"\s*:\s*"reviewCount"/);

    const formattedSlug = slug.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

    let image = metaData.image
        || (schemaImageMatch ? schemaImageMatch[1] : null)
        || (rawImageMatch ? `https://cdn.zeptonow.com/production/ik-seo/tr:w-1000,ar-1000-1000,pr-true,f-avif,q-40,dpr-2/${rawImageMatch?.[1]}` : null);

    return {
        platform: 'Zepto',
        name:     metaData.name || (schemaNameMatch ? schemaNameMatch[1] : formattedSlug),
        brand:    schemaBrandMatch ? schemaBrandMatch[1] : '-',
        price,
        mrp,
        rating:   ratingMatch  ? parseFloat(ratingMatch[1])  : 0,
        reviews:  reviewMatch  ? parseInt(reviewMatch[1])    : 0,
        image,
        currency: 'INR',
        status:   'active',
        inStock:  true,
    };
}

const randomHex = n => [...Array(n)].map(() => Math.floor(Math.random() * 16).toString(16)).join('');

module.exports = zepto;