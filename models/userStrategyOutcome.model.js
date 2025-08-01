// models/userStrategyOutcome.model.js
const mongoose = require("mongoose");

const outcomeDetailsSchema = new mongoose.Schema(
  {
    estimatedDebtFreeDate: {
      type: Date,
      required: true,
    },
    totalInterestPaid: {
      type: Number,
      required: true,
    },
    totalSavings: {
      type: Number,
      required: true,
    },
  },
  { _id: false }
);

const userStrategyOutcomeSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      unique: true,
      required: true,
    },
    avalanche: {
      type: outcomeDetailsSchema,
      required: true,
    },
    snowball: {
      type: outcomeDetailsSchema,
      required: true,
    },
    ai: {
      type: outcomeDetailsSchema,
      required: true,
    },
    custom: {
      type: outcomeDetailsSchema,
      // custom can be optional until the user defines an order
      required: false,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model(
  "UserStrategyOutcome",
  userStrategyOutcomeSchema
);
