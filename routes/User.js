const router = require("express").Router();

const { postLogin, postSignup, getValidate } = require("../controllers/User");

router.post("/login", postLogin);
router.post("/signup", postSignup);
router.get("/validate", getValidate);

module.exports = router;
