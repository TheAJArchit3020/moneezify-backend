//agent/handlers.js
const Debt = require("../models/debt.model");
const ExpenseDashboardSummary = require("../models/expenseDashboardSummary.model");
const UserDetails = require("../models/userDetails.model");
const ExpenseCategory = require("../models/expenseCategory.model");
const DashboardSummary = require("../models/dashboardSummary.model");

const clamp = (n, lo, hi, d) => {
  const v = Number.isFinite(+n) ? +n : d;
  return Math.max(lo, Math.min(hi, v));
};

const pick = (obj, fields) => {
  if (!fields || !fields.length) return obj;
  const out = {};
  for (const f of fields)
    if (Object.prototype.hasOwnProperty.call(obj, f)) out[f] = obj[f];
  return out;
};

async function handle_get_user_debts(userId, args) {
  const {
    onlyOpen = true,
    minApr,
    sortBy = "apr_desc",
    includeFields,
    limit = 200,
  } = args;

  const q = { user: userId };
  if (onlyOpen) q.balance = { $gt: 0 };
  if (Number.isFinite(minApr)) q.apr = { $gte: +minApr };

  const sortMap = {
    apr_desc: { apr: -1 },
    apr_asc: { apr: 1 },
    balance_desc: { balance: -1 },
    balance_asc: { balance: 1 },
    minpay_desc: { minPaymentAmount: -1 },
    minpay_asc: { minPaymentAmount: 1 },
    created_desc: { createdAt: -1 },
    created_asc: { createdAt: 1 },
  };
  const rows = await Debt.find(q)
    .select(
      "_id name creditorName principal balance minPaymentAmount apr nextDueDate tagColor debtPaidOff createdAt updatedAt"
    )
    .sort(sortMap[sortBy] || sortMap.apr_desc)
    .limit(clamp(limit, 1, 200, 200))
    .lean();

  const data = includeFields?.length
    ? rows.map((r) => pick(r, includeFields))
    : rows;
  return { count: data.length, debts: data };
}

async function handle_get_expense_dashboard_summary(userId, args) {
  const now = new Date();
  let {
    year = now.getFullYear(),
    month = now.getMonth() + 1,
    includeFields,
    recentLimit = 20,
    trendTail = 90,
    fallbackToLatest = true,
  } = args;

  let doc = await ExpenseDashboardSummary.findOne({
    user: userId,
    year,
    month,
  }).lean();
  if (!doc && fallbackToLatest) {
    doc = await ExpenseDashboardSummary.findOne({ user: userId })
      .sort({ year: -1, month: -1 })
      .lean();
  }
  if (!doc)
    return { found: false, message: "No expense dashboard summary available." };

  const rLim = clamp(recentLimit, 1, 200, 20);
  const tLim = clamp(trendTail, 1, 366, 90);

  const shaped = {
    year: doc.year,
    month: doc.month,
    totalBudget: doc.totalBudget,
    totalSpent: doc.totalSpent,
    byCategory: (doc.byCategory || []).map((c) => ({
      category: c.category,
      categoryName: c.categoryName,
      budget: c.budget,
      spent: c.spent,
    })),
    recentExpenses: (doc.recentExpenses || []).slice(0, rLim),
    spendingTrend: (doc.spendingTrend || []).slice(-tLim),
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };

  const data = includeFields?.length ? pick(shaped, includeFields) : shaped;
  return { found: true, summary: data };
}

async function handle_get_user_details(userId, args) {
  const { includeFields } = args || {};
  const doc = await UserDetails.findOne({ user: userId })
    .select(
      "name email phoneNumber age profession personalIncome totalHouseholdIncome approxMonthlyExpenses selectedCurrency currentStrategy createdAt updatedAt"
    )
    .lean();
  if (!doc) return { found: false };

  const shaped = {
    name: doc.name,
    email: doc.email,
    phoneNumber: doc.phoneNumber,
    age: doc.age,
    profession: doc.profession,
    personalIncome: doc.personalIncome,
    totalHouseholdIncome: doc.totalHouseholdIncome,
    approxMonthlyExpenses: doc.approxMonthlyExpenses,
    selectedCurrency: doc.selectedCurrency,
    currentStrategy: doc.currentStrategy,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };

  const data = includeFields?.length ? pick(shaped, includeFields) : shaped;
  return { found: true, details: data };
}

async function handle_get_expense_categories(userId, args) {
  const { includeFields, limit = 200 } = args || {};
  const rows = await ExpenseCategory.find({ user: userId })
    .select("_id name color budget isDefault createdAt updatedAt")
    .sort({ name: 1 })
    .limit(clamp(limit, 1, 500, 200))
    .lean();
  const data = includeFields?.length
    ? rows.map((r) => pick(r, includeFields))
    : rows;
  return { count: data.length, categories: data };
}

// 5) get_dashboard_summary
async function handle_get_dashboard_summary(userId, args) {
  const { includeFields, upcomingLimit = 3, balanceLimit = 50 } = args || {};
  console.log(userId);
  const doc = await DashboardSummary.findOne({ user: userId }).lean();
  if (!doc) return { found: false };

  const shaped = {
    debtFreeDate: doc.debtFreeDate,
    payoffPct: doc.payoffPct,
    totalBalance: doc.totalBalance,
    totalDebtPaid: doc.totalDebtPaid,
    balanceByDebt: (doc.balanceByDebt || []).slice(
      0,
      clamp(balanceLimit, 1, 200, 50)
    ),
    upcomingTransactions: (doc.upcomingTransactions || []).slice(
      0,
      clamp(upcomingLimit, 1, 20, 3)
    ),
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };

  const data = includeFields?.length ? pick(shaped, includeFields) : shaped;
  return { found: true, dashboard: data };
}

module.exports = {
  handle_get_user_debts,
  handle_get_expense_dashboard_summary,
  handle_get_user_details,
  handle_get_expense_categories,
  handle_get_dashboard_summary,
};
