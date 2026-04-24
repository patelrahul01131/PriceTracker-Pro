const express = require("express");
const { login, signup, getProfile, updateProfile } = require("../controller/auth");
const checkauth = require("../middleware/checkauth");
const router = express.Router();


router.post("/signup", signup);

router.post("/login", login);

router.get("/me", checkauth, getProfile);
router.put("/me", checkauth, updateProfile);

module.exports = router;
