const mongoose = require("mongoose");
const softDeletePlugin = require("../lib/softDeletePlugin");

const payoffPlanSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    strategy: {
      type: String,
      enum: ["hybrid", "avalanche", "snowball", "custom"],
      default: "avalanche",
    },
    customPlanRef: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "CustomPlan",
      required: function () {
        return this.strategy === "custom";
      },
    },
    debtOrder: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Debt",
      },
    ],
    customOrder: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Debt",
      },
    ],

    // summary fields
    estimatedDebtFreeDate: { type: Date },
    totalInterestPaid: { type: Number, default: 0 },
    totalSavings: { type: Number, default: 0 },

    lastGeneratedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

payoffPlanSchema.plugin(softDeletePlugin);
payoffPlanSchema.index({ purgeAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model("PayoffPlan", payoffPlanSchema);
