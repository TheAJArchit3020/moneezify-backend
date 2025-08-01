// models/debtTransaction.model.js
const mongoose = require("mongoose");

const debtTransactionSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    debt: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Debt",
      required: true,
    },

    // Balance immediately before this payment
    openingBalance: {
      type: Number,
      required: true,
    },

    // Total payment applied this period (min + any extra)
    paymentAmount: {
      type: Number,
      required: true,
    },

    // Breakdown of that payment
    principalComponent: {
      type: Number,
      required: true,
    },
    interestComponent: {
      type: Number,
      required: true,
    },

    // Balance immediately after this payment
    closingBalance: {
      type: Number,
      required: true,
    },

    // When this payment is due
    dueDate: {
      type: Date,
      required: true,
    },

    // Track status for past vs upcoming vs missed
    status: {
      type: String,
      enum: ["paid", "upcoming", "missed"],
      default: "upcoming",
    },

    // Free‐form note (e.g. user annotation)
    note: {
      type: String,
      trim: true,
      default: "",
    },
  },
  {
    timestamps: true,
  }
);

// Index to speed lookups by user/debt and sort by dueDate
debtTransactionSchema.index({ user: 1, debt: 1, dueDate: 1 });

module.exports = mongoose.model("DebtTransaction", debtTransactionSchema);
