const express = require("express");
const { login, signup } = require("../controller/auth");
const checkauth = require("../middleware/checkauth");
const router = express.Router();


router.post("/signup", signup);

router.post("/login", login);

router.get("/me", checkauth, (req, res) => {
    res.json(req.user);
});


module.exports = router;
