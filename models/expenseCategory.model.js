// models/expenseCategory.model.js
const mongoose = require("mongoose");

const expenseCategorySchema = new mongoose.Schema(
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
    color: {
      type: String,
      required: true,
      match: /^#([0-9A-F]{3}){1,2}$/i,
    },
    budget: {
      type: Number,
      default: 0,
      min: 0,
    },
    isDefault: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

// prevent duplicates per user
expenseCategorySchema.index({ user: 1, name: 1 }, { unique: true });

module.exports = mongoose.model("ExpenseCategory", expenseCategorySchema);
