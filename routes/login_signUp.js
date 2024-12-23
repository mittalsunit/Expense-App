const express = require("express");
const router = express.Router();
const { postLogIn, postSignUp } = require("../controllers/login_signUp");

router.post("/signup", postSignUp);
router.post("/login", postLogIn);

module.exports = router;
