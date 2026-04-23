const flipkart = require("./flipkart");
const ajio    = require("./ajio");
const meesho  = require("./meesho");
const zepto   = require("./zepto");
const scrap   = require("./scrap");

/**
 * Fetch the latest price for a product URL.
 * Routes to the correct scraper based on the domain.
 *
 * @param {string} url
 * @returns {Promise<{ price: number } | null>}
 */
async function checkPrice(url) {
  try {
    let result = null;

    if (url.includes("flipkart")) {
      result = await flipkart(url);
    } else if (url.includes("ajio")) {
      result = await ajio(url);
    } else if (url.includes("meesho")) {
      result = await meesho(url);
    } else if (url.includes("zepto")) {
      result = await zepto(url);
    } else {
      result = await scrap(url);
    }

    if (!result || result.price == null) return null;

    // Normalise price to a plain number
    const price =
      typeof result.price === "string"
        ? parseFloat(result.price.replace(/[^\d.]/g, ""))
        : Number(result.price);

    if (isNaN(price) || price <= 0) return null;

    return { price, inStock: result.inStock ?? null };
  } catch (err) {
    console.error(`[checkPrice] Error for ${url}:`, err.message);
    return null;
  }
}

module.exports = checkPrice;
