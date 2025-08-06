// controllers/category.controller.js
const ExpenseCategory = require("../models/expenseCategory.model");

// GET /api/categories
async function listCategories(req, res) {
  const cats = await ExpenseCategory.find({ user: req.user.id });
  res.json(cats);
}

// POST /api/categories
async function createCategory(req, res) {
  const { name, color, budget } = req.body;
  const cat = await ExpenseCategory.create({
    user: req.user.id,
    name,
    color,
    budget,
    isDefault: false,
  });
  res.status(201).json(cat);
}

// PUT /api/categories/:id
async function updateCategory(req, res) {
  const { id } = req.params;
  const { name, color, budget } = req.body;

  const cat = await ExpenseCategory.findOneAndUpdate(
    { _id: id, user: req.user.id },
    { name, color, budget },
    { new: true }
  );
  if (!cat) return res.status(404).json({ error: "Category not found" });
  res.json(cat);
}

// DELETE /api/categories/:id
async function deleteCategory(req, res) {
  const { id } = req.params;
  const cat = await ExpenseCategory.findOne({ _id: id, user: req.user.id });
  if (!cat) return res.status(404).json({ error: "Category not found" });
  if (cat.isDefault) {
    return res.status(400).json({ error: "Cannot delete a default category" });
  }
  await cat.deleteOne();
  res.json({ success: true });
}

module.exports = {
  listCategories,
  createCategory,
  updateCategory,
  deleteCategory,
};
