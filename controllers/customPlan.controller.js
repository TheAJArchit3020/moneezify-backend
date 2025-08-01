// controllers/customPlan.controller.js
const CustomPlan = require("../models/customPlan.model");
const UserDetails = require("../models/userDetails.model");
const Debt = require("../models/debt.model");
const simulateStrategyOutcome = require("../services/simulateStrategyOutcome");
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

  //   userId,
  //     debts,
  //     income,
  //     totalExpenses,
  //     strategy,
  //     customOrder = [],
  //     extraPayments = [],
  //     preview = false,
  // 4) Simulate custom outcome
  // estimatedDebtFreeDate: lastDueDate,
  //     totalInterestPaid: +totalInterest.toFixed(2),
  //     totalSavings: +(interestNoExtra - totalInterest).toFixed(2),

  const outcome = await generateFullPlan({
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

module.exports = { createCustomPlan };
