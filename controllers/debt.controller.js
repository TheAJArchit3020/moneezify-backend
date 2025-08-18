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
const {
  computeAndUpsertStrategyOutcomes,
} = require("../services/strategyOutcome.service");

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

  try {
    // 1) Create the debt
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

    // 2) Fetch profile + current strategy
    const details = await UserDetails.findOne({ user: userId });
    if (!details) {
      return res
        .status(400)
        .json({ error: "User details not found. Create details first." });
    }
    const strategy = details.strategy || details.currentStrategy || "avalanche";

    // 3) If strategy is custom, append this debt to the custom plan’s order
    let customPlanId = null;
    let customOrder = [];
    if (strategy === "custom") {
      const lastPlan = await PayoffPlan.findOne({
        user: userId,
        strategy: "custom",
      }).populate("customPlanRef");

      // Either use the existing custom plan or create one if missing
      let cp =
        lastPlan?.customPlanRef ||
        (await CustomPlan.create({ user: userId, debtOrder: [] }));
      customPlanId = cp._id;

      // Push this new debt into the custom order if not already present
      if (!cp.debtOrder.map(String).includes(String(savedDebt._id))) {
        cp = await CustomPlan.findByIdAndUpdate(
          customPlanId,
          { $push: { debtOrder: savedDebt._id } },
          { new: true }
        );
      }
      customOrder = cp.debtOrder.map(String);
    }

    // 4) Recompute outcomes (preview-only; does NOT write DebtTransaction)
    const debtsNow = await Debt.find({ user: userId }); // includes the new debt
    const safeNum = (n) => (Number.isFinite(n) ? n : Number(n) || 0);
    const incomeTotal =
      safeNum(details.personalIncome) + safeNum(details.totalHouseholdIncome);
    const totalExpenses = safeNum(details.approxMonthlyExpenses); // from createUserDetails

    await computeAndUpsertStrategyOutcomes({
      userId,
      debts: debtsNow,
      income: incomeTotal,
      totalExpenses,
      preview: true,
    });

    // 5) Regenerate the **active** plan (this writes DebtTransaction docs)
    // keep your existing signature; if your function doesn't need `res`, drop it.
    const plan = await regeneratePlanForUser(
      userId,
      strategy,
      customPlanId,
      res
    );

    // 6) Notify downstream
    eventBus.emit("dataChanged", { userId });

    // 7) Respond
    return res.status(201).json({ debt: savedDebt, plan });
  } catch (err) {
    console.error("addDebt error:", err);
    return res.status(500).json({ error: "Failed to add debt" });
  }
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
    debtName: debt.name,
    creditorName: debt.creditorName,
  };
  res.status(200).json({
    payload,
  });
}

async function getDebtsSummaries(userId, inProgress) {
  // 1. fetch all in-progress debts
  const inProgressDebts = await Debt.find({
    user: userId,
    balance: inProgress ? { $lte: 0 } : { $gt: 0 },
  }).lean();

  // 2. for each debt, grab its last txn and compute payoff%
  const summaries = await Promise.all(
    inProgressDebts.map(async (d) => {
      const lastTxn = await DebtTransaction.findOne({
        user: userId,
        debt: d._id,
      })
        .sort({ dueDate: -1 })
        .select("dueDate")
        .lean();

      // payoff% = (paid / principal) * 100
      const payoffPct = ((d.principal - d.balance) / d.principal) * 100;

      return {
        id: d._id,
        payoffPct: Math.round(payoffPct * 100) / 100, // e.g. 42.37
        minPaymentAmount: d.minPaymentAmount,
        apr: d.apr,
        completionDate: lastTxn?.dueDate || null,
        tagColor: d.tagColor,
        name: d.name,
        balance: d.balance,
      };
    })
  );

  return summaries;
}
async function getTotalDebtPaid(userId) {
  const debts = await Debt.find({ user: userId }).select("principal balance");

  const totalBalanceRaw = debts.reduce((sum, d) => sum + d.balance, 0);
  const totalBalance = Math.round(totalBalanceRaw * 100) / 100;

  const totalPrincipalRaw = debts.reduce((sum, d) => sum + d.principal, 0);
  const totalPrincipal = Math.round(totalPrincipalRaw * 100) / 100;

  const totalPaidRaw = totalPrincipal - totalBalance;
  const totalPaid = Math.round(totalPaidRaw * 100) / 100;

  return totalPaid;
}

async function getDebtPage(req, res) {
  const userId = req.user.id;
  const debts = await Debt.find({ user: userId });

  if (!debts || debts.length === 0) {
    return res.status(404).json({ message: "No debts found for this user." });
  }
  const totalBalanceRaw = debts.reduce((sum, d) => sum + d.balance, 0);
  const totalBalance = Math.round(totalBalanceRaw * 100) / 100;
  const totalPaid = await getTotalDebtPaid(userId);

  const inProgressDebts = await getDebtsSummaries(userId, false);
  const completedDebts = await getDebtsSummaries(userId, true);

  const debtPage = {
    totalBalance,
    totalPaid,
    inProgressDebts,
    completedDebts,
  };

  res.status(200).json(debtPage);
}
module.exports = { addDebt, getDebt, getDebtPage };
