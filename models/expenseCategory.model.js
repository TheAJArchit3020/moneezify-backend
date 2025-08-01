const mongoose = require("mongoose");

const expenseCategorySchema = new mongoose.Schema(
  {
    user: {
      // `null` for default categories, or ObjectId for user‑created ones
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    isDefault: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

// Ensure a user can’t create two categories with the same name
expenseCategorySchema.index(
  { user: 1, name: 1 },
  { unique: true, partialFilterExpression: { user: { $type: "objectId" } } }
);

// Ensure default names are unique among defaults
expenseCategorySchema.index(
  { user: 1, name: 1 },
  { unique: true, partialFilterExpression: { user: null } }
);

module.exports = mongoose.model("ExpenseCategory", expenseCategorySchema);
