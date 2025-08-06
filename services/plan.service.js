const UserDetails = require("../models/userDetails.model");
const Debt = require("../models/debt.model");
const PayoffPlan = require("../models/payoffPlan.model");
const CustomPlan = require("../models/customPlan.model");
const generateFullPlan = require("./planGenerator");
async function regeneratePlanForUser(userId, strategy, customPlanId, res) {
  // 1) load details, debts
  // 2) if custom, load customPlanId to get order+extras
  // 3) call generateFullPlan(...)
  // 4) upsert PayoffPlan
  // 5) return the saved plan

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
    income: details.personalIncome + details.totalHouseholdIncome,
    totalExpenses: details.approxMonthlyExpenses,
    strategy,
    customOrder,
    extraPayments,
  });

  let debtOrder = [];
  if (strategy === "custom" && customPlanId) {
    const cp = await CustomPlan.findOne({ _id: customPlanId, user: userId });
    if (!cp) throw new Error("Custom plan not found.");
    debtOrder = cp.debtOrder;
  } else if (strategy === "avalanche" || strategy === "ai") {
    debtOrder = debts
      .slice()
      .sort((a, b) => b.apr - a.apr)
      .map((d) => d._id);
  } else if (strategy === "snowball") {
    debtOrder = debts
      .slice()
      .sort((a, b) => a.balance - b.balance)
      .map((d) => d._id);
  }

  const plan = await PayoffPlan.findOneAndUpdate(
    { user: userId },
    {
      user: userId,
      strategy,
      customOrder,
      customPlanRef: customPlanId,
      debtOrder,
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
