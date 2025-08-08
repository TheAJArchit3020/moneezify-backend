// src/services/dashboardService.js
const DashboardSummary = require("../models/dashboardSummary.model");
const Debt = require("../models/debt.model");
const DebtTransaction = require("../models/debtTransaction.model");
const PayoffPlan = require("../models/payoffPlan.model");

async function getTotalPaidFromTransactions(userId) {
  const debts = await Debt.find({ user: userId }).select("principal balance");

  const totalBalanceRaw = debts.reduce((sum, d) => sum + d.balance, 0);
  const totalBalance = Math.round(totalBalanceRaw * 100) / 100;

  const totalPrincipalRaw = debts.reduce((sum, d) => sum + d.principal, 0);
  const totalPrincipal = Math.round(totalPrincipalRaw * 100) / 100;

  const totalPaidRaw = totalPrincipal - totalBalance;
  const totalPaid = Math.round(totalPaidRaw * 100) / 100;

  return totalPaid;
}

function round2(x) {
  return Math.round((x + Number.EPSILON) * 100) / 100;
}
async function rebuildDashboardForUser(userId) {
  // 1) debtFreeDate & payoffPct from PayoffPlan
  const plan = await PayoffPlan.findOne({ user: userId });
  const debtFreeDate = plan?.estimatedDebtFreeDate || null;

  const debts = await Debt.find({ user: userId }).select(
    "balance name principal tagColor"
  );

  const totalBalanceRaw = debts.reduce((sum, d) => sum + d.balance, 0);
  const totalBalance = round2(totalBalanceRaw);

  const totalPrincipalRaw = debts.reduce((sum, d) => sum + d.principal, 0);
  const totalPrincipal = round2(totalPrincipalRaw);
  const totalPaidRaw = await getTotalPaidFromTransactions(userId);
  const totalPaid = round2(totalPaidRaw);

  // payoffPct: you could compute (amount paid vs original principal) ×100
  // here we’ll assume plan.payoffPct was stored
  const payoffPctRaw = (totalPaid / totalPrincipal) * 100 || 0;
  const payoffPct = round2(Math.min(payoffPctRaw, 100));

  // 2) totalBalance & balanceByDebt

  const balanceByDebt = debts.map((d) => ({
    debtName: d.name,
    balance: d.balance,
    color: d.tagColor, // default color if not set
  }));
  console.log(balanceByDebt.color);
  // 3) totalDebtPaid
  const totalDebtPaid = totalPaid;

  // 4) next 3 upcoming transactions
  const upcoming = await DebtTransaction.find({
    user: userId,
    status: "upcoming",
  })
    .sort({ dueDate: 1 })
    .limit(10)
    .populate("debt", "name");

  const upcomingTransactions = upcoming.map((t) => ({
    debtTransaction: t._id,
    debtName: t.debt.name,
    amount: t.paymentAmount,
    dueDate: t.dueDate,
  }));

  // 5) Upsert DashboardSummary
  await DashboardSummary.findOneAndUpdate(
    { user: userId },
    {
      debtFreeDate,
      payoffPct,
      totalBalance,
      totalDebtPaid,
      balanceByDebt,
      upcomingTransactions,
    },
    { upsert: true, new: true }
  );
}

module.exports = { rebuildDashboardForUser };
