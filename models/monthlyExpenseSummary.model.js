const mongoose = require("mongoose");
const softDeletePlugin = require("../lib/softDeletePlugin");

const categoryAmountSchema = new mongoose.Schema(
  {
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ExpenseCategory",
      required: true,
    },
    amount: {
      type: Number,
      default: 0,
    },
  },
  { _id: false }
);

const monthlyExpenseSummarySchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    year: {
      type: Number,
      required: true,
    },
    month: {
      type: Number,
      required: true,
      min: 1,
      max: 12,
    },

    // Budgets per category (seed from registration or user edits)
    budget: {
      type: [categoryAmountSchema],
      default: [],
    },

    // Aggregated totals per category
    total: {
      type: [categoryAmountSchema],
      default: [],
    },

    // Convenience metrics
    totalAll: {
      type: Number,
      default: 0,
    },
    avgDaily: {
      type: Number,
      default: 0,
    },
    variance: {
      type: Number,
      default: 0, // (sum of budgets) - totalAll
    },

    lastCalculated: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

// One summary per user / year / month
monthlyExpenseSummarySchema.index(
  { user: 1, year: 1, month: 1 },
  { unique: true }
);

monthlyExpenseSummarySchema.plugin(softDeletePlugin);
monthlyExpenseSummarySchema.index({ purgeAt: 1 }, { expireAfterSeconds: 0 });
module.exports = mongoose.model(
  "MonthlyExpenseSummary",
  monthlyExpenseSummarySchema
);
