// models/subscription.model.js
const mongoose = require("mongoose");

const subscriptionSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    platform: {
      type: String,
      enum: ["trial", "apple", "google"],
      required: true,
    },
    productId: { type: String, required: true },
    // Google Play
    purchaseToken: { type: String },
    // Apple
    receiptData: { type: String },

    purchaseDate: { type: Date, required: true },
    expiryDate: { type: Date, required: true },
    autoRenewStatus: { type: Boolean, default: true },
    status: {
      type: String,
      enum: ["active", "cancelled", "expired", "grace_period"],
      default: "active",
    },
    environment: {
      type: String,
      enum: ["production", "sandbox"],
      default: "production",
    },
    isTrial: { type: Boolean, default: false },
  },
  { timestamps: true }
);

subscriptionSchema.index(
  { user: 1, platform: 1, productId: 1 },
  { unique: true }
);

module.exports = mongoose.model("Subscription", subscriptionSchema);
