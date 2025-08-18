const mongoose = require("mongoose");
const softDeletePlugin = require("../lib/softDeletePlugin");
const extraPaymentSchema = new mongoose.Schema(
  {
    debt: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Debt",
      required: true,
    },
    extraAmount: {
      type: Number,
      required: true,
      min: 0,
    },
  },
  { _id: false }
);

const customPlanSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    debtOrder: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Debt",
        required: true,
      },
    ],
    extraPayments: {
      type: [extraPaymentSchema],
      default: [],
    },
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
  {
    timestamps: true,
  }
);

// Ensure each user can’t reuse the same plan name
customPlanSchema.index(
  { user: 1, name: 1 },
  { unique: true, partialFilterExpression: { isDeleted: { $eq: false } } }
);
customPlanSchema.plugin(softDeletePlugin);
customPlanSchema.index({ purgeAt: 1 }, { expireAfterSeconds: 0 });
module.exports = mongoose.model("CustomPlan", customPlanSchema);
