// models/expenseCategory.model.js
const mongoose = require("mongoose");
const softDeletePlugin = require("../lib/softDeletePlugin");
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
expenseCategorySchema.index({ user: 1 });
expenseCategorySchema.index(
  { name: 1 },
  { unique: true, partialFilterExpression: { isDeleted: { $eq: false } } }
);
expenseCategorySchema.plugin(softDeletePlugin);
expenseCategorySchema.index({ purgeAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model("ExpenseCategory", expenseCategorySchema);
