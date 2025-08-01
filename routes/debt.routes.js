// routes/debt.routes.js
const express = require("express");
const router = express.Router();
const auth = require("../middlewares/auth.middleware");
const { addDebt } = require("../controllers/debt.controller");

router.post("/debt", auth, addDebt);

module.exports = router;
