// routes/auth.routes.js
const express = require("express");
const authMiddleware = require("../middlewares/auth.middleware");
const {
  logExpense,
  getExpenseDashboard,
  getAllExpensesWithFilters,
} = require("../controllers/expense.controller");
const router = express.Router();
const subscription = require("../middlewares/subscription.middleware");

router.post("/logExpense", authMiddleware, subscription, logExpense);
router.get("/dashboard", authMiddleware, getExpenseDashboard);
router.get("/", authMiddleware, getAllExpensesWithFilters);
module.exports = router;
