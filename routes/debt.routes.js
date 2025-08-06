// routes/debt.routes.js
const express = require("express");
const router = express.Router();
const auth = require("../middlewares/auth.middleware");
const { addDebt, getDebt } = require("../controllers/debt.controller");

router.post("/debt", auth, addDebt);
router.get("/debt/:id", auth, getDebt);
module.exports = router;
