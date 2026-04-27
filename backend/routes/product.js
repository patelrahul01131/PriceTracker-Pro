const express = require("express");
const router = express.Router();
const checkauth = require("../middleware/checkauth");
const { trackProduct, getAllProducts, getProductById, toggleProductCheck, manualCheckPrice, deleteProduct } = require("../controller/ProductController");

router.post("/track", checkauth, trackProduct);
router.get("/all", checkauth, getAllProducts);
router.get("/:id", checkauth, getProductById);
router.patch("/:id/toggle-check", checkauth, toggleProductCheck);
router.post("/:id/manual-check", checkauth, manualCheckPrice);
router.delete("/:id", checkauth, deleteProduct);

module.exports = router;