const eventBus = require("../events/eventBus");
const debtModel = require("../models/debt.model");
const debtTransactionModel = require("../models/debtTransaction.model");
const payoffPlanModel = require("../models/payoffPlan.model");
const { regeneratePlanForUser } = require("../services/plan.service");

async function selectStrategy(req, res) {
  const userId = req.user.id;
  const { strategy, customPlanId } = req.body;

  const plan = await regeneratePlanForUser(userId, strategy, customPlanId);

  eventBus.emit("dataChanged", { userId: userId });
  res.json(plan);
}

async function getPayoffPlan(req, res) {
  const userId = req.user.id;
  const plan = await payoffPlanModel
    .findOne({ user: userId })
    .select("-__v")
    .lean();
  if (!plan) {
    return res.status(404).json({ error: "Payoff plan not found." });
  }

  const rawSteps = await debtTransactionModel
    .find({
      user: userId,
      status: "upcoming",
    })
    .sort({ dueDate: 1 })
    .select("amount dueDate debt")
    .populate({ path: "debt", select: "name" })
    .lean();

  const stepWisePlan = rawSteps.map((txn) => ({
    id: txn._id,
    amount: txn.amount,
    dueDate: txn.dueDate,
    name: txn.debt.name,
  }));

  const debts = await debtModel
    .find({ _id: { $in: plan.debtOrder } })
    .select("name apr principal balance")
    .lean();

  const debtOrder = await Promise.all(
    plan.debtOrder.map(async (debtId) => {
      // find the debt doc
      const d = debts.find((x) => x._id.toString() === debtId.toString());
      // get last transaction for that debt
      const lastTxn = await debtTransactionModel
        .findOne({ debt: debtId })
        .sort({ dueDate: -1 })
        .select("dueDate")
        .lean();

      return {
        id: d._id,
        name: d.name,
        apr: d.apr,
        payoffProgress: ((d.principal - d.balance) / d.principal) * 100,
        estimatedDebtFreeDate: lastTxn?.dueDate ?? null,
      };
    })
  );

  res.json({
    ...plan,
    stepWisePlan,
    debtOrder,
  });
}

module.exports = { selectStrategy, getPayoffPlan };
