const Product = require("../model/product");
const flipkart = require("../components/flipkart");
const scrap = require("../components/scrap");
const ajio = require("../components/ajio");
const meesho = require("../components/meesho");
const checkPrice = require("../components/checkPrice");

const trackProduct = async (req, res) => {
    const url = req.body.url;

    try {
        let product = null; 

        if(url.includes("flipkart")){
            product = await flipkart(url);
        }
        else if(url.includes("ajio")){
            product = await ajio(url);
        }
        else if(url.includes("meesho")){
            product = await meesho(url);
        }
        else{
            product = await scrap(url);
        }


        if (!product) {
            return res.status(500).json({ message: "Failed to scrape product" });
        }

        console.log(product);

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
        console.log(error);
        return res.status(500).json({ message: "Failed to track product", error: error.message });
    }
};

const getAllProducts = async (req, res) => {
    try {
        const products = await Product.find({ user: req.user.id });
        return res.status(200).json({ products });
    } catch (error) {
        console.log(error);
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
        console.log(error);
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
        console.log(error);
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

        const result = await checkPrice(product.url);

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

module.exports = { trackProduct, getAllProducts, getProductById, toggleProductCheck, manualCheckPrice };