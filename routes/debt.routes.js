// routes/debt.routes.js
const express = require("express");
const router = express.Router();
const auth = require("../middlewares/auth.middleware");
const {
  addDebt,
  getDebt,
  getDebtPage,
} = require("../controllers/debt.controller");

router.post("/debt", auth, addDebt);
router.get("/debt/:id", auth, getDebt);
router.get("/debtpage", auth, getDebtPage);
module.exports = router;
