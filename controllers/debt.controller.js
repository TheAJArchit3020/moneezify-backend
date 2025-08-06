// controllers/debt.controller.js
const Debt = require("../models/debt.model");
const DebtTransaction = require("../models/debtTransaction.model");
const UserDetails = require("../models/userDetails.model");
const PayoffPlan = require("../models/payoffPlan.model");
const generateFullPlan = require("../services/planGenerator");
const { selectStrategy } = require("./payoffPlan.controller");
const { regeneratePlanForUser } = require("../services/plan.service");
const CustomPlan = require("../models/customPlan.model");
const mongoose = require("mongoose");
const eventBus = require("../events/eventBus");
async function addDebt(req, res) {
  const userId = req.user.id;
  const {
    name,
    creditorName,
    principal,
    balance,
    minPaymentAmount,
    apr,
    nextDueDate,
    tagColor,
  } = req.body;

  // 1) create the debt
  const debt = await Debt.create({
    user: userId,
    name,
    creditorName,
    principal,
    balance,
    minPaymentAmount,
    apr,
    nextDueDate,
    tagColor,
  });
  const savedDebt = await debt.save();

  // 3) fetch the current strategy from profile
  const details = await UserDetails.findOne({ user: userId });
  const strategy = details.currentStrategy;

  let customPlanId;
  if (strategy === "custom") {
    // assume you store the chosen custom plan id on details or elsewhere
    // here’s a quick example reading from the last PayoffPlan doc
    const lastPlan = await PayoffPlan.findOne({
      user: userId,
      strategy: "custom",
    });
    customPlanId = lastPlan.customPlanRef._id;

    const customPlan = await CustomPlan.findOneAndUpdate(
      { _id: customPlanId },
      { $push: { debtOrder: savedDebt._id } },
      { upsert: true }
    );
  }
  const plan = await regeneratePlanForUser(userId, strategy, customPlanId, res);

  eventBus.emit("dataChanged", { userId: userId });

  // 8) return both the new debt and the updated plan
  res.status(201).json({ debt, plan });
}

async function getDebt(req, res) {
  const userId = req.user.id;
  const debtId = req.params.id;

  if (!debtId) {
    return res.status(400).json({ error: "Debt ID is required." });
  }

  const debt = await Debt.findOne({ _id: debtId, user: userId }).lean();

  const debtTransactions = await DebtTransaction.find({
    debt: debtId,
    user: userId,
  }).sort({ dueDate: 1 });

  const debtFreeTimeline = debtTransactions.map((txn) => ({
    amount: txn.paymentAmount,
    dueDate: txn.dueDate,
  }));

  const paidTransactions = debtTransactions
    .filter((txn) => txn.status === "paid")
    .map((txn) => ({
      id: txn._id,
      amount: txn.paymentAmount,
      dueDate: txn.dueDate,
    }));
  const upcomingTransactions = debtTransactions
    .filter((txn) => txn.status === "upcoming")
    .map((txn) => ({
      id: txn._id,
      amount: txn.paymentAmount,
      dueDate: txn.dueDate,
    }));

  const rawPayoffProgress =
    ((debt.principal - debt.balance) / debt.principal) * 100;

  const payoffProgress = Math.round(rawPayoffProgress, 2);

  const payload = {
    currentBalance: debt.balance,
    upcomingTransactions,
    paidTransactions,
    payoffProgress,
    debtFreeTimeline,
  };
  res.status(200).json({
    payload,
  });
}
module.exports = { addDebt, getDebt };
