// models/userStrategyOutcome.model.js
const mongoose = require("mongoose");
const softDeletePlugin = require("../lib/softDeletePlugin");

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
    hybrid: {
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
userStrategyOutcomeSchema.plugin(softDeletePlugin);
userStrategyOutcomeSchema.index({ purgeAt: 1 }, { expireAfterSeconds: 0 });
module.exports = mongoose.model(
  "UserStrategyOutcome",
  userStrategyOutcomeSchema
);
