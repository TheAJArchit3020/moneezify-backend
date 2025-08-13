// services/expenseDashboardService.js
const ExpenseDashboardSummary = require("../models/expenseDashboardSummary.model");
const ExpenseCategory = require("../models/expenseCategory.model");
const ExpenseEntry = require("../models/expenseEntry.model");

async function rebuildExpenseDashboard(userId, year, month) {
  // 1) Fetch all categories + budgets for user
  const cats = await ExpenseCategory.find({ user: userId });
  const categoryMap = cats.reduce((m, c) => {
    m[c._id.toString()] = { name: c.name, budget: c.budget };
    return m;
  }, {});

  // 2) Fetch this month’s expenses
  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 1);
  const entries = await ExpenseEntry.find({
    user: userId,
    date: { $gte: start, $lt: end },
  })
    .sort({ date: -1 })
    .populate("category", "name budget");

  console.log("Expense entries:", entries);

  // 3) Tally totals and per‐category spend
  let totalSpent = 0;
  const byCat = {};
  entries.forEach((e) => {
    totalSpent += e.amount;
    const cid = String(e.category._id);
    byCat[cid] = (byCat[cid] || 0) + e.amount;
  });

  // 4) Build byCategory array
  const byCategory = cats.map((c) => ({
    category: c._id,
    budget: c.budget,
    categoryName: c.name,
    spent: parseFloat((byCat[String(c._id)] || 0).toFixed(2)),
  }));

  // 5) Build recentExpenses
  const recentExpenses = entries.map((e) => ({
    expense: e._id,
    date: e.date,
    category: e.category.name,
    amount: parseFloat(e.amount.toFixed(2)),
    note: e.note,
  }));
  //here we also need to add a spending trend which is a graph of spending over the month
  const spendingTrend = entries.map((e) => ({
    date: e.date,
    amount: parseFloat(e.amount.toFixed(2)),
  }));

  // 6) Upsert summary
  await ExpenseDashboardSummary.findOneAndUpdate(
    { user: userId, year, month },
    {
      totalBudget: parseFloat(
        byCategory.reduce((s, c) => s + c.budget, 0).toFixed(2)
      ),
      totalSpent: parseFloat(totalSpent.toFixed(2)),
      byCategory,
      recentExpenses,
      spendingTrend,
    },
    { upsert: true, new: true }
  );
}

module.exports = { rebuildExpenseDashboard };
