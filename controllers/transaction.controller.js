// controllers/transaction.controller.js
const DebtTransaction = require("../models//debtTransaction.model");
const PayoffPlan = require("../models/payoffPlan.model");
const UserDetails = require("../models/userDetails.model");
const Debt = require("../models/debt.model");
const { regeneratePlanForUser } = require("../services/plan.service");
const eventBus = require("../events/eventBus");

async function logPayment(req, res) {
  const userId = req.user.id;
  const txnId = req.params.id;
  const { amountPaid } = req.body;

  const txn = await DebtTransaction.findOne({ _id: txnId, user: userId });
  if (!txn) return res.status(404).json({ error: "Transaction not found." });
  if (!amountPaid) return res.status(404).json({ error: "Need amount" });
  if (txn.status === "paid")
    return res.status(400).json({ error: "Already paid." });
  const txnOrderCheck = await DebtTransaction.findOne({
    debt: txn.debt,
    user: userId,
    status: "upcoming",
  }).sort({ dueDate: 1 });

  // 3) If it isn’t the same as the one they’re trying to log, reject
  if (txnOrderCheck._id.toString() !== txn._id.toString()) {
    return res.status(400).json({
      error:
        "Please log payments in order. You need to pay the next upcoming installment first.",
    });
  }
  // 2) Compute new components
  const openingBalance = txn.openingBalance;
  const plannedInterest = txn.interestComponent;
  const plannedPayment = txn.paymentAmount;

  const interestPaid = Math.min(amountPaid, plannedInterest);
  const principalPaid = +(amountPaid - interestPaid).toFixed(2);
  const closingBalance = +(openingBalance - principalPaid).toFixed(2);

  txn.status = "paid";
  txn.paymentAmount = amountPaid;
  txn.interestComponent = interestPaid;
  txn.principalComponent = principalPaid;
  txn.closingBalance = closingBalance;
  await txn.save();

  const nextTxn = await DebtTransaction.findOne({
    debt: txn.debt,
    user: userId,
    status: "upcoming",
  }).sort({ dueDate: 1 });

  const debt = await Debt.findByIdAndUpdate(txn.debt, {
    balance: txn.closingBalance,
    nextDueDate: nextTxn ? nextTxn.dueDate : null,
  });

  if (Math.abs(amountPaid) === Math.abs(plannedPayment)) {
    const plan = await PayoffPlan.findOne({ user: userId });
    eventBus.emit("dataChanged", { userId: userId });
    return res.json({ transaction: txn, plan });
  }

  const details = await UserDetails.findOne({ user: userId });
  if (!details) return res.status(400).json({ error: "User details missing." });

  //   b) Pull strategy & customOrder from existing payoff plan
  const existingPlan = await PayoffPlan.findOne({ user: userId });
  if (!existingPlan)
    return res.status(400).json({ error: "No active plan found." });

  const newPlan = await regeneratePlanForUser(
    userId,
    existingPlan.strategy,
    existingPlan.strategy === "custom" ? existingPlan.customPlanRef : null,
    res
  );

  eventBus.emit("dataChanged", { userId: userId });
  console.log("event Bus Called");
  res.json({ transaction: txn, plan: existingPlan });
}

async function getTransaction(req, res) {
  const userId = req.user.id;
  const txnId = req.params.id;

  const txn = await DebtTransaction.findOne({ _id: txnId, user: userId })
    .populate("debt", "name")
    .lean();
  if (!txn) return res.status(404).json({ error: "Transaction not found." });

  // Fetch the debt details
  const debt = await Debt.findById(txn.debt).select(
    "name apr principal balance"
  );

  if (!debt) {
    return res.status(404).json({ error: "Debt not found." });
  }

  res.json({ transaction: txn });
}

module.exports = { logPayment, getTransaction };
