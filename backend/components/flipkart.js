const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());

async function flipkart(url) {
    const browser = await puppeteer.launch({
        headless: "new",
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-blink-features=AutomationControlled',
            '--window-size=1920,1080'
        ]
    });

    const page = await browser.newPage();
    
    // 1. Set a very specific, modern User Agent
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36');
    await page.setViewport({ width: 1920, height: 1080 });

    try {
        console.log(`🚀 [Flipkart] Navigating to: ${url}`);
        
        // 2. Use 'networkidle2' to ensure the challenge script has time to resolve
        await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });

        // 3. Wait for a random human-like interval (2-4 seconds)
        await new Promise(r => setTimeout(r, 2000 + Math.random() * 2000));

        // 4. Check if we hit the "Human" block
        const isBlocked = await page.evaluate(() => {
            const text = document.body.innerText;
            return text.includes('Are you a human?') || text.includes('captcha');
        });

        if (isBlocked) {
            console.log("⚠️ Blocked by CAPTCHA. Attempting a quick reload...");
            await page.reload({ waitUntil: 'networkidle2' });
            await new Promise(r => setTimeout(r, 3000));
        }

        const productData = await page.evaluate(() => {
            const res = {
                name: null, price: null, image: null,
                brand: "-", rating: 0, platform: "Flipkart",
                status: "active", currency: "INR", inStock: true
            };

            // Strategy 1: JSON-LD (Standard Metadata)
            const scripts = document.querySelectorAll('script[type="application/ld+json"]');
            scripts.forEach(script => {
                try {
                    const json = JSON.parse(script.textContent);
                    const item = Array.isArray(json) ? json.find(i => i['@type'] === 'Product') : json;
                    if (item && item['@type'] === 'Product') {
                        res.name = item.name;
                        res.brand = item.brand?.name || item.brand || "-";
                        res.rating = item.aggregateRating?.ratingValue || 0;
                        res.price = item.offers?.price || item.offers?.[0]?.price;
                        res.image = Array.isArray(item.image) ? item.image[0] : item.image;
                    }
                } catch (e) {}
            });

            // Strategy 2: CSS Fallback (If blocked or JSON-LD fails)
            if (!res.name || res.name.includes('human')) {
                res.name = document.querySelector('.B_NuCI')?.innerText || document.querySelector('h1')?.innerText;
                res.price = document.querySelector('.Nx9bqj')?.innerText?.replace(/[^\d]/g, '');
                res.brand = document.querySelector('.G6XhRU')?.innerText || "-";
                res.rating = document.querySelector('.XQDdHH')?.innerText || 0;
            }

            return res;
        });

        // 5. Final validation before returning to Controller
        if (!productData.name || productData.name.includes('Are you a human?')) {
            console.error("❌ Extraction failed: Still hitting CAPTCHA.");
            return null; 
        }

        return {
            ...productData,
            price: parseFloat(productData.price),
            rating: parseFloat(productData.rating)
        };

    } catch (error) {
        console.error("❌ Puppeteer Error:", error.message);
        return null;
    } finally {
        await browser.close();
    }
}

module.exports = flipkart;