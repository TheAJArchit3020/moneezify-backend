const mongoose = require("mongoose");

const balanceByDebtSchema = new mongoose.Schema({
  balance: {
    type: String,
    default: 0,
  },
  debtName: {
    type: String,
    default: 0,
  },
  color: {
    type: String,
  },
});

const upcomingTransactionsSchema = new mongoose.Schema({
  debtTransaction: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "DebtTransaction",
    required: true,
  },
  debtName: {
    type: String,
    required: true,
    trim: true,
  },
  amount: {
    type: Number,
    required: true,
    min: 0,
  },
  dueDate: {
    type: Date,
    required: true,
  },
});

const dashboardSummarySchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      unique: true,
      required: true,
    },

    // Debt‑free countdown & progress
    debtFreeDate: { type: Date },
    payoffPct: { type: Number, default: 0 }, // 0–100%
    totalBalance: { type: Number, default: 0 },
    totalDebtPaid: { type: Number, default: 0 },

    // debt category if you prefer)
    balanceByDebt: {
      type: [balanceByDebtSchema],
      default: [],
    },

    // Next 2–3 upcoming transactions
    upcomingTransactions: {
      type: [upcomingTransactionsSchema],
      default: [],
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("DashboardSummary", dashboardSummarySchema);
