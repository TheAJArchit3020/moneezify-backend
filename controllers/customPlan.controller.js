// controllers/customPlan.controller.js
const CustomPlan = require("../models/customPlan.model");
const UserDetails = require("../models/userDetails.model");
const Debt = require("../models/debt.model");

const generateFullPlan = require("../services/planGenerator");

async function createCustomPlan(req, res) {
  const userId = req.user.id;
  const { name, debtOrder, extraPayments = [] } = req.body;

  // 1) Validate inputs
  if (!name || !Array.isArray(debtOrder) || debtOrder.length === 0) {
    return res.status(400).json({ error: "Name and debtOrder are required." });
  }

  // 2) Fetch user details
  const details = await UserDetails.findOne({ user: userId });
  if (!details) {
    return res.status(400).json({ error: "Complete your profile first." });
  }

  // 3) Fetch all debts
  const debts = await Debt.find({ user: userId });
  if (!debts.length) {
    return res.status(400).json({ error: "No debts found for user." });
  }

  const outcome = await generateFullPlan({
    userId,
    debts,
    income: details.personalIncome + details.totalHouseholdIncome,
    totalExpenses: details.approxMonthlyExpenses,
    strategy: "custom",
    customOrder: debtOrder,
    extraPayments,
    preview: true,
  });
  console.log(outcome);
  console.log({
    estimatedDebtFreeDate: outcome.estimatedDebtFreeDate,
    totalInterestPaid: outcome.totalInterestPaid,
    totalSavings: outcome.totalSavings,
  });

  // 5) Persist the custom plan
  const customPlan = await CustomPlan.create({
    user: userId,
    name,
    debtOrder,
    extraPayments,
    estimatedDebtFreeDate: outcome.estimatedDebtFreeDate,
    totalInterestPaid: outcome.totalInterestPaid,
    totalSavings: outcome.totalSavings,
  });

  // 6) Return the saved plan
  res.status(201).json(customPlan);
}

async function getDefaultCustomPlan(req, res) {
  const userId = req.user.id;

  //here the custom plan is where the strategy is
  //  "custom" and the user didnt add any order or extra payments
  // for the debts so the estimated Payoff dat, Total Interest paid,
  // You save will be values assuming the user only pays the min per month
  // for all the debts and there is not debt order so there is no sort for the debts
  //  while sending the debt order as well

  //here take debts which blance is greater than 0
  const debts = await Debt.find({ user: userId, balance: { $gt: 0 } });
  if (!debts.length) {
    return res.status(400).json({ error: "No debts found for user." });
  }

  const userDetails = await UserDetails.findOne({ user: userId });
  if (!userDetails) {
    return res.status(400).json({ error: "User details not found." });
  }
  const { personalIncome, totalHouseholdIncome, approxMonthlyExpenses } =
    userDetails;

  const income = personalIncome + totalHouseholdIncome;
  const totalExpenses = approxMonthlyExpenses;

  const customPlanOutcome = await generateFullPlan({
    userId,
    debts,
    income,
    totalExpenses,
    strategy: "custom",
    customOrder: [],
    extraPayments: [],
    preview: true,
  });

  //for each debt wee need to get Monthly Minimum, APR, Completes on, Pay of percentage
  const debtOrder = debts.map((debt) => ({
    id: debt._id,
    name: debt.name,
    creditorName: debt.creditorName,
    balance: debt.balance,
    minPaymentAmount: debt.minPaymentAmount,
    apr: debt.apr,
    payoffProgress: ((debt.principal - debt.balance) / debt.principal) * 100,
  }));

  const customPlan = {
    debtOrder,
    estimatedDebtFreeDate: customPlanOutcome.estimatedDebtFreeDate,
    totalInterestPaid: customPlanOutcome.totalInterestPaid,
    totalSavings: customPlanOutcome.totalSavings,
  };

  res.json(customPlan);
}

async function previewCustomPlan(req, res) {
  const userId = req.user.id;
  const { debtOrder, extraPayments = [] } = req.body;
  if (!Array.isArray(debtOrder) || debtOrder.length === 0) {
    return res.status(400).json({ error: "Debt order is required." });
  }

  const debts = await Debt.find({ user: userId, balance: { $gt: 0 } });
  if (!debts.length) {
    return res.status(400).json({ error: "No debts found for user." });
  }

  const userDetails = await UserDetails.findOne({ user: userId });
  if (!userDetails) {
    return res.status(400).json({ error: "User details not found." });
  }
  const { personalIncome, totalHouseholdIncome, approxMonthlyExpenses } =
    userDetails;

  const income = personalIncome + totalHouseholdIncome;
  const totalExpenses = approxMonthlyExpenses;

  const outcome = await generateFullPlan({
    debts,
    income,
    totalExpenses,
    strategy: "custom",
    customOrder: debtOrder,
    extraPayments,
    preview: true,
  });
  res.json({
    estimatedDebtFreeDate: outcome.estimatedDebtFreeDate,
    totalInterestPaid: outcome.totalInterestPaid,
    totalSavings: outcome.totalSavings,
  });
}

async function getUserCustomPlans(req, res) {
  try {
    const userId = req.user.id;

    const plans = await CustomPlan.find({ user: userId })
      .select("_id name")
      .sort({ createdAt: -1 })
      .lean();

    // Shape the response as an array of { id, name }
    const result = plans.map((p) => ({ id: String(p._id), name: p.name }));

    return res.json({ plans: result }); // empty array if none
  } catch (err) {
    console.error("getUserCustomPlans error:", err);
    return res.status(500).json({ error: "Failed to fetch custom plans." });
  }
}

module.exports = {
  createCustomPlan,
  getDefaultCustomPlan,
  previewCustomPlan,
  getUserCustomPlans,
};
