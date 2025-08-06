// models/expenseDashboardSummary.model.js
const mongoose = require("mongoose");

const categoryBreakdownSchema = new mongoose.Schema(
  {
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ExpenseCategory",
      required: true,
    },
    budget: {
      type: Number,
      required: true,
      default: 0,
    },
    spent: {
      type: Number,
      required: true,
      default: 0,
    },
  },
  { _id: false }
);

const recentExpenseSchema = new mongoose.Schema(
  {
    expense: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ExpenseEntry",
      required: true,
    },
    date: { type: Date, required: true },
    category: { type: String, required: true },
    amount: { type: Number, required: true },
    note: { type: String, default: "" },
  },
  { _id: false }
);

const expenseDashboardSummarySchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      unique: true,
      required: true,
    },
    year: { type: Number, required: true },
    month: { type: Number, required: true, min: 1, max: 12 },

    totalBudget: { type: Number, default: 0 },
    totalSpent: { type: Number, default: 0 },

    byCategory: { type: [categoryBreakdownSchema], default: [] },
    recentExpenses: { type: [recentExpenseSchema], default: [] },
  },
  {
    timestamps: true,
  }
);

expenseDashboardSummarySchema.index(
  { user: 1, year: 1, month: 1 },
  { unique: true }
);

module.exports = mongoose.model(
  "ExpenseDashboardSummary",
  expenseDashboardSummarySchema
);
