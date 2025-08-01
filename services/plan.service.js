const UserDetails = require("../models/userDetails.model");
const Debt = require("../models/debt.model");
const UserStrategyOutcome = require("../models/userStrategyOutcome.model");
const PayoffPlan = require("../models/payoffPlan.model");
const CustomPlan = require("../models/customPlan.model");
const generateFullPlan = require("./planGenerator");
async function regeneratePlanForUser(userId, strategy, customPlanId, res) {
  // 1) load details, debts
  // 2) if custom, load customPlanId to get order+extras
  // 3) call generateFullPlan(...)
  // 4) upsert PayoffPlan
  // 5) return the saved plan

  // 1) Fetch stored outcome (includes budgetsSnapshot & summaries)
  const outcome = await UserStrategyOutcome.findOne({ user: userId });
  if (!outcome) {
    return res.status(400).json({ error: "Strategy outcomes not found." });
  }

  // 2) Fetch user details (to get income)
  const details = await UserDetails.findOneAndUpdate(
    { user: userId },
    {
      currentStrategy: strategy,
    },
    { upsert: true, new: false }
  );
  if (!details) {
    return res.status(400).json({ error: "User details missing." });
  }

  // 3) Fetch debts (no transactions yet)
  const debts = await Debt.find({ user: userId });
  if (!debts.length) return res.status(400).json({ error: "No debts found." });

  let customOrder = [],
    extraPayments = [];
  if (strategy === "custom") {
    const cp = await CustomPlan.findOne({ _id: customPlanId, user: userId });
    if (!cp) return res.status(400).json({ error: "Custom plan not found." });
    customOrder = cp.debtOrder;
    extraPayments = cp.extraPayments;
  }
  const planSummary = await generateFullPlan({
    userId,
    debts,
    income: details.personalIncome,
    totalExpenses: details.approxMonthlyExpenses,
    strategy,
    customOrder,
    extraPayments,
  });

  const plan = await PayoffPlan.findOneAndUpdate(
    { user: userId },
    {
      user: userId,
      strategy,
      customOrder,
      customPlanRef: customPlanId,
      planTransactions: planSummary.transactionIds,
      estimatedDebtFreeDate: planSummary.estimatedDebtFreeDate,
      totalInterestPaid: planSummary.totalInterestPaid,
      totalSavings: planSummary.totalSavings,
      lastGeneratedAt: new Date(),
    },
    { upsert: true, new: true }
  );

  return plan;
}
module.exports = { regeneratePlanForUser };
