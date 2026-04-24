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
            '--window-size=1920,1080',
            // 🚀 SPEED BOOST: Disable GPU and unnecessary rendering features
            '--disable-gpu',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--mute-audio'
        ]
    });

    const page = await browser.newPage();
    
    // 1. Set a very specific, modern User Agent
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36');
    await page.setViewport({ width: 1920, height: 1080 });

    // 🚀 SPEED BOOST: Intercept and block heavy resources (Images, CSS, Fonts)
    await page.setRequestInterception(true);
    page.on('request', (req) => {
        const resourceType = req.resourceType();
        if (['image', 'stylesheet', 'font', 'media'].includes(resourceType)) {
            req.abort();
        } else {
            req.continue();
        }
    });

try {
        console.log(`📡 [Flipkart] Performing Security Warmup...`);
        
        // 🚀 THE FIX: Visit the homepage first to grab the Security Clearance Cookies
        await page.goto('https://www.flipkart.com/', { waitUntil: 'domcontentloaded', timeout: 30000 });
        
        // Give the Stealth Plugin 1.5 seconds to pass the background JavaScript tests
        await new Promise(r => setTimeout(r, 1500));

        console.log(`🚀 [Flipkart] Navigating to Product: ${url}`);
        
        // Now navigate to the actual product. Flipkart sees we came from their homepage!
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });

        // 🚀 SPEED BOOST: Check for CAPTCHA instantly, don't wait 4 seconds!
        const isBlocked = await page.evaluate(() => {
            const text = document.body.innerText;
            return text.includes('Are you a human?') || text.includes('captcha');
        });

        if (isBlocked) {
            console.log("⚠️ Still Blocked. Attempting a quick reload...");
            await page.reload({ waitUntil: 'domcontentloaded' });
            await new Promise(r => setTimeout(r, 2000));
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

            // Strategy 2: CSS Fallback
            if (!res.name || res.name.includes('human')) {
                res.name = document.querySelector('.B_NuCI')?.innerText || document.querySelector('h1')?.innerText;
                res.price = document.querySelector('.Nx9bqj')?.innerText?.replace(/[^\d]/g, '');
                res.brand = document.querySelector('.G6XhRU')?.innerText || "-";
                res.rating = document.querySelector('.XQDdHH')?.innerText || 0;
            }

            return res;
        });

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