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

  // 8) return both the new debt and the updated plan
  res.status(201).json({ debt, plan });
}

module.exports = { addDebt };
