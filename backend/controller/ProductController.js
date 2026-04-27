const Product = require("../model/product");
const flipkart = require("../components/flipkart");
const ajio = require("../components/ajio");
const meesho = require("../components/meesho");
const zepto = require("../components/zepto");
const tatacliq = require("../components/tatacliq");
const jiomart = require("../components/jiomart");
const snapdeal = require("../components/snapdeal");
const mi = require("../components/mi");
const bigbasket = require("../components/bigbasket");
const scrap = require("../components/scrap");
const checkPrice = require("../components/checkPrice");

const trackProduct = async (req, res) => {
    const url = req.body.url;

    try {
        let product = null; 

        // If user already selected a price from popup
        if (req.body.productData && req.body.selectedPrice) {
            product = req.body.productData;
            product.price = req.body.selectedPrice;
        } else {
            if(url.includes("flipkart")){
                product = await flipkart(url);
            }
            else if(url.includes("ajio")){
                product = await ajio(url);
            }
            else if(url.includes("meesho")){
                product = await meesho(url);
            }
            else if (url.includes('zepto.com' )) {
                product = await zepto(url);
            }
            else if(url.includes("tatacliq.com")){
                product = await tatacliq(url);
            }
            else if (url.includes('jiomart.com')) {
                product = await jiomart(url);
            }
            else if (url.includes('snapdeal.com')) {
                product = await snapdeal(url);
            }
            else if (url.includes('mi.com')) {
                product = await mi(url);
            }
            else if (url.includes('bigbasket.com')) {
                product = await bigbasket(url);
            }
            else{
                product = await scrap(url);
            }
        }

        if (!product) {
            console.log("failed to scrape product");
            return res.status(500).json({ message: "Failed to scrape product" });
        }

        // If multiple prices detected and no price selected yet
        if (product.multiplePrices && product.multiplePrices.length > 1 && !req.body.selectedPrice) {
            return res.status(202).json({
                message: "Multiple prices detected. Please select the accurate price.",
                requirePriceSelection: true,
                productData: product,
                priceOptions: product.multiplePrices
            });
        }

        if (!product || isNaN(product.price) || product.price === null) {
            console.log("⚠️ Scraper returned invalid data. Aborting save to DB.");
            return res.status(400).json({ 
                success: false, 
                message: "We couldn't get a valid price for this item." 
            });
        }

        // console.log(product);

        const newProduct = new Product({
            name: product.name,
            platform: product.platform,
            brand: product.brand,
            image: product.image,
            url: url,
            currency: product.currency,
            register_price: product.price,
            price: product.price,
            mrp: product.mrp,
            discount: product.discount,
            rating: product.rating,
            reviewsCount: product.reviewsCount,
            category: product.category,
            description: product.description,
            features: product.features,
            inStock: product.inStock,
            status: product.status,
            user: req.user.id,
            last_check_date: new Date(),
            lastcheck: [{
                price: product.price,
                date: new Date()
            }]
        });

        await newProduct.save();

        // ✅ only one res.json() at the end
        return res.status(201).json({ message: "Product tracked successfully", product: newProduct });

    } catch (error) {
        console.log("failed to track product");
        return res.status(500).json({ message: "Failed to track product", error: error.message });
    }
};

const getAllProducts = async (req, res) => {
    try {
        const products = await Product.find({ user: req.user.id });
        return res.status(200).json({ products });
    } catch (error) {
        console.log("failed to get products");
        return res.status(500).json({ message: "Failed to get products", error: error.message });
    }
};

const getProductById = async (req, res) => {
    try {
        const product = await Product.findOne({ _id: req.params.id, user: req.user.id });
        if (!product) {
            return res.status(404).json({ message: "Product not found" });
        }
        return res.status(200).json({ product });
    } catch (error) {
        console.log("failed to get product");
        return res.status(500).json({ message: "Failed to get product", error: error.message });
    }
};

const toggleProductCheck = async (req, res) => {
    try {
        const product = await Product.findOne({ _id: req.params.id, user: req.user.id });
        if (!product) {
            return res.status(404).json({ message: "Product not found" });
        }
        product.status = product.status === "active" ? "inactive" : "active";
        await product.save();
        return res.status(200).json({ product });
    } catch (error) {
        console.log("failed to toggle product");
        return res.status(500).json({ message: "Failed to toggle product", error: error.message });
    }
};

/**
 * POST /api/product/:id/manual-check
 * Immediately re-scrapes the product URL and updates the DB.
 * Returns the full updated product so the frontend can refresh.
 */
const manualCheckPrice = async (req, res) => {
    try {
        const product = await Product.findOne({ _id: req.params.id, user: req.user.id });
        if (!product) {
            return res.status(404).json({ message: "Product not found" });
        }

        // Pass the current price so the scraper can pick the closest one if multiple prices are detected
        const result = await checkPrice(product.url, product.price);

        if (!result || result.price == null) {
            return res.status(502).json({ message: "Could not fetch the latest price. The store may be temporarily unavailable." });
        }

        const now = new Date();
        const update = {
            price: result.price,
            last_check_date: now,
            $push: { lastcheck: { price: result.price, date: now } },
        };
        if (result.inStock !== null) update.inStock = result.inStock;

        const updated = await Product.findByIdAndUpdate(
            product._id,
            update,
            { new: true }  // return the updated document
        );

        return res.status(200).json({ product: updated });
    } catch (error) {
        console.log(error);
        return res.status(500).json({ message: "Manual price check failed", error: error.message });
    }
};

const deleteProduct = async (req, res) => {
    try {
        const product = await Product.findOneAndDelete({ _id: req.params.id, user: req.user.id });
        if (!product) {
            return res.status(404).json({ message: "Product not found" });
        }
        return res.status(200).json({ message: "Product deleted successfully" });
    } catch (error) {
        console.log("failed to delete product");
        return res.status(500).json({ message: "Failed to delete product", error: error.message });
    }
};

module.exports = { trackProduct, getAllProducts, getProductById, toggleProductCheck, manualCheckPrice, deleteProduct };