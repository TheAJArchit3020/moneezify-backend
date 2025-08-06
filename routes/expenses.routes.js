// routes/auth.routes.js
const express = require("express");
const authMiddleware = require("../middlewares/auth.middleware");
const {
  logExpense,
  getExpenseDashboard,
} = require("../controllers/expense.controller");
const router = express.Router();

router.post("/logExpense", authMiddleware, logExpense);
router.get("/dashboard", authMiddleware, getExpenseDashboard);
module.exports = router;
