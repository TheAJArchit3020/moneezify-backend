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
    totalDebtPaid: { type: Number, default: 0 },

    // debt category if you prefer)
    balanceByCategory: {
      type: [categoryAmountSchema],
      default: [],
    },

    // Next 2–3 upcoming transactions
    nextTransactions: {
      type: [nextTxnSchema],
      default: [],
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("DashboardSummary", dashboardSummarySchema);
