// routes/auth.routes.js
const express = require("express");
const router = express.Router();
const { googleSignIn, devLogin } = require("../controllers/auth.controller");

router.post("/googleSignIn", googleSignIn);
router.post("/dev-login", devLogin);

module.exports = router;
