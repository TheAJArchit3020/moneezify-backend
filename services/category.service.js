// services/category.service.js
const ExpenseCategory = require("../models/expenseCategory.model");

async function seedDefaultCategoriesForUser(userId, defaultCategories) {
  const docs = defaultCategories.map((c) => ({
    user: userId,
    name: c.name,
    color: c.color,
    budget: c.budget,
    isDefault: true,
  }));
  await ExpenseCategory.insertMany(docs);
}

module.exports = { seedDefaultCategoriesForUser };
