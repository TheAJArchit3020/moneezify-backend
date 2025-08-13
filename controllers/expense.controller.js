const eventBus = require("../events/eventBus");
const expenseDashboardSummaryModel = require("../models/expenseDashboardSummary.model");
const ExpenseEntry = require("../models/expenseEntry.model");

async function logExpense(req, res) {
  const userId = req.user.id;
  const { amount, category, date, description } = req.body;

  // 1) Validate inputs
  if (!amount || !category || !date) {
    return res
      .status(400)
      .json({ error: "Amount, category, and date are required." });
  }

  // 2) Create the expense record
  try {
    const expense = await ExpenseEntry.create({
      user: userId,
      amount,
      category,
      date,
      description,
    });
    eventBus.emit("expenseChanged", {
      userId: req.user.id,
      year: expense.date.getFullYear(),
      month: expense.date.getMonth() + 1,
    });

    // 3) Respond with the created expense
    res.status(201).json(expense);
  } catch (error) {
    console.error("Error logging expense:", error);
    res.status(500).json({ error: "Failed to log expense." });
  }
}

async function getExpenseDashboard(req, res) {
  const { year, month } = req.query;
  const userId = req.user.id;
  const summary = await expenseDashboardSummaryModel.findOne({
    user: userId,
    year: parseInt(year),
    month: parseInt(month),
  });
  if (!summary) {
    // Optionally trigger a rebuild on‐demand
    // await rebuildExpenseDashboard(userId, +year, +month);
    return res.json({
      totalBudget: 0,
      totalSpent: 0,
      byCategory: [],
      recentExpenses: [],
    });
  }
  res.json(summary);
}

async function getAllExpensesWithFilters(req, res) {
  const userId = req.user.id;
  const { startDate, endDate, category } = req.query;
  console.log({ category });

  if (!userId) {
    return res.status(401).json({ error: "Unauthorized access." });
  }
  if (!startDate && !endDate) {
    return res
      .status(400)
      .json({ error: "At least one date filter is required." });
  }

  let filter = {};
  try {
    filter = { user: userId };
    if (startDate) filter.date = { $gte: new Date(startDate) };
    if (endDate) filter.date = { $lte: new Date(endDate) };
    //there can be multiple categories and we will always get categories in array format
    if (Array.isArray(category) && category.length > 0) {
      filter.category = { $in: category };
    } else if (category) {
      filter.category = category;
    }
  } catch (error) {
    return res.status(400).json({ error: "Invalid date format." });
  }

  console.log(filter);

  try {
    //here in the expense list we will also include the category name and color
    const expenses = await ExpenseEntry.find(filter)
      .populate("category", "name color")
      .sort({ date: -1 });
    res.json(expenses);
  } catch (error) {
    console.error("Error fetching expenses:", error);
    res.status(500).json({ error: "Failed to fetch expenses." });
  }
}

module.exports = {
  logExpense,
  getExpenseDashboard,
  getAllExpensesWithFilters,
};
