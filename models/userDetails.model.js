const mongoose = require("mongoose");
const softDeletePlugin = require("../lib/softDeletePlugin");

const userDetailsSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },
    name: { type: String, required: true, trim: true },
    email: { type: String, trim: true },
    phoneNumber: { type: String, trim: true },
    age: { type: Number, required: true },
    profession: { type: String, default: "" },
    personalIncome: { type: Number, required: true },
    totalHouseholdIncome: { type: Number, default: 0 },
    approxMonthlyExpenses: { type: Number, default: 0, required: true },
    selectedCurrency: { type: String, default: "$" },
    currentStrategy: {
      type: String,
      enum: ["avalanche", "snowball", "ai", "custom"],
      default: "avalanche",
    },
  },
  { timestamps: true }
);
userDetailsSchema.plugin(softDeletePlugin);
userDetailsSchema.index(
  { email: 1 },
  { unique: true, partialFilterExpression: { isDeleted: { $eq: false } } }
);
userDetailsSchema.index({ purgeAt: 1 }, { expireAfterSeconds: 0 });
module.exports = mongoose.model("UserDetails", userDetailsSchema);

//debt balance
//total debt paid calculation is wrong
