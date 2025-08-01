const mongoose = require("mongoose");

const userDetailsSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },
    name: { type: String, required: true, trim: true },
    age: { type: Number, required: true },
    profession: { type: String, default: "" },
    personalIncome: { type: Number, required: true },
    totalHouseholdIncome: { type: Number, default: 0 },
    approxMonthlyExpenses: { type: Number, default: 0, required: true },
    currentStrategy: {
      type: String,
      enum: ["avalanche", "snowball", "ai", "custom"],
      default: "avalanche",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("UserDetails", userDetailsSchema);
