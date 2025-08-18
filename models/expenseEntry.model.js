const mongoose = require("mongoose");
const softDeletePlugin = require("../lib/softDeletePlugin");

const expenseEntrySchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ExpenseCategory",
      required: true,
    },
    amount: {
      type: Number,
      required: true,
    },
    date: {
      type: Date,
      default: Date.now,
    },
    note: {
      type: String,
      trim: true,
      default: "",
    },
  },
  { timestamps: true }
);

// Index to speed up monthly lookups
expenseEntrySchema.index({ user: 1, date: 1 });
expenseEntrySchema.plugin(softDeletePlugin);
expenseEntrySchema.index({ purgeAt: 1 }, { expireAfterSeconds: 0 });
module.exports = mongoose.model("ExpenseEntry", expenseEntrySchema);
