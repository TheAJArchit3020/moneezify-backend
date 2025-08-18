const User = require("../models/user.model");
const UserDetails = require("../models/userDetails.model");
const Debt = require("../models/debt.model");
const UserStrategyOutcome = require("../models/userStrategyOutcome.model");
const generateFullPlan = require("../services/planGenerator");
const {
  seedDefaultCategoriesForUser,
} = require("../services/category.service");
const { regeneratePlanForUser } = require("../services/plan.service");
const eventBus = require("../events/eventBus");
const debtTransactionModel = require("../models/debtTransaction.model");
const customPlanModel = require("../models/customPlan.model");
const payoffPlanModel = require("../models/payoffPlan.model");
const expenseCategoryModel = require("../models/expenseCategory.model");
const expenseEntryModel = require("../models/expenseEntry.model");
const monthlyExpenseSummaryModel = require("../models/monthlyExpenseSummary.model");
const expenseDashboardSummaryModel = require("../models/expenseDashboardSummary.model");
const dashboardSummaryModel = require("../models/dashboardSummary.model");
const subscriptionModel = require("../models/subscription.model");
const mongoose = require("mongoose");

// POST /api/user/details
async function createUserDetails(req, res) {
  const userId = req.user.id;
  const {
    name,
    age,
    email,
    profession,
    personalIncome,
    totalHouseholdIncome = 0,
    expenseByCategory,
    strategy,
    phoneNumber,
    debts = [],
    currency,
  } = req.body;
  // 1) Prevent duplicate details
  if (await UserDetails.findOne({ user: userId })) {
    return res.status(400).json({ error: "Details already created." });
  }

  const totalApproxExpenses =
    expenseByCategory.investment +
    expenseByCategory.food +
    expenseByCategory.health +
    expenseByCategory.miscellaneous;

  // 2) Create profile
  const details = await UserDetails.create({
    user: userId,
    name,
    age,
    profession,
    personalIncome,
    totalHouseholdIncome,
    strategy,
    email,
    phoneNumber,
    approxMonthlyExpenses: totalApproxExpenses,
    selectedCurrency: currency || "$",
  });
  await User.findByIdAndUpdate(userId, { detailsRef: details._id });

  // 3) Persist debts (no transactions yet)
  const createdDebts = await Promise.all(
    debts.map((d) =>
      Debt.create({
        user: userId,
        name: d.name,
        creditorName: d.creditorName,
        principal: d.principal,
        balance: d.balance,
        minPaymentAmount: d.minPaymentAmount,
        apr: d.apr,
        nextDueDate: d.nextDueDate,
        tagColor: d.tagColor,
      })
    )
  );
  // const debts = await Debt.find({ user: userId });
  //   if (!debts.length) return res.status(400).json({ error: "No debts found." });

  // 4) Simulate each strategy

  // const [av, sb, ai, cu] = ["avalanche", "snowball", "ai", "custom"].map(
  //   async (strat) => {
  //     await generateFullPlan({
  //       debts: createdDebts,
  //       income: personalIncome + totalHouseholdIncome,
  //       totalExpenses: totalApproxExpenses,
  //       strategy: strat,
  //       preview: true,
  //     });
  //   }
  // );
  const av = await generateFullPlan({
    debts: createdDebts,
    income: personalIncome + totalHouseholdIncome,
    totalExpenses: totalApproxExpenses,
    strategy: "avalanche",
    preview: true,
  });
  const sb = await generateFullPlan({
    debts: createdDebts,
    income: personalIncome + totalHouseholdIncome,
    totalExpenses: totalApproxExpenses,
    strategy: "snowball",
    preview: true,
  });

  const hybrid = await generateFullPlan({
    debts: createdDebts,
    income: personalIncome + totalHouseholdIncome,
    totalExpenses: totalApproxExpenses,
    strategy: "hybrid",
    preview: true,
  });

  const cu = await generateFullPlan({
    debts: createdDebts,
    income: personalIncome + totalHouseholdIncome,
    totalExpenses: totalApproxExpenses,
    strategy: "custom",
    preview: true,
  });
  // 5) Upsert into UserStrategyOutcome
  const outcome = await UserStrategyOutcome.findOneAndUpdate(
    { user: userId },
    { avalanche: av, snowball: sb, hybrid, custom: cu },
    { upsert: true, new: true }
  );
  const DEFAULT_CATS = [
    { name: "Food", color: "#E67E22", budget: expenseByCategory.food },
    {
      name: "Investment",
      color: "#2980B9",
      budget: expenseByCategory.investment,
    },
    { name: "Health", color: "#C0392B", budget: expenseByCategory.health },
    {
      name: "Miscellaneous",
      color: "#7F8C8D",
      budget: expenseByCategory.miscellaneous,
    },
  ];

  if (strategy) {
    const plan = await regeneratePlanForUser(userId, strategy);
  }
  await seedDefaultCategoriesForUser(userId, DEFAULT_CATS);
  eventBus.emit("dataChanged", { userId: userId });
  // 6) Respond
  res.status(201).json({
    details,
    debts: createdDebts,
    strategyOutcomes: outcome,
  });
}

// GET /api/user/details
async function getUserDetails(req, res) {
  const userId = req.user.id;
  const details = await UserDetails.findOne({ user: userId });
  if (!details) {
    return res.status(404).json({ error: "User details not found." });
  }
  res.json(details);
}

async function deleteUserAccount(req, res) {
  const userId = req.user.id;
  const session = await mongoose.startSession();
  const daysToPurge = 30;
  const now = new Date();

  // simple retry for transient txn errors
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      await session.withTransaction(
        async () => {
          await User.updateOne(
            { _id: userId },
            {
              $set: {
                isDeleted: true,
                deletedAt: now,
                purgeAt: new Date(now.getTime() + daysToPurge * 86400000),
              },
            },
            { session }
          );

          const args = [userId, session, daysToPurge];
          await Promise.all([
            UserDetails.softDeleteManyByUser(...args),
            Debt.softDeleteManyByUser(...args),
            debtTransactionModel.softDeleteManyByUser(...args),
            expenseCategoryModel.softDeleteManyByUser(...args),
            expenseEntryModel.softDeleteManyByUser(...args),
            monthlyExpenseSummaryModel.softDeleteManyByUser(...args),
            expenseDashboardSummaryModel.softDeleteManyByUser(...args),
            dashboardSummaryModel?.softDeleteManyByUser?.(...args) ??
              Promise.resolve(),
            payoffPlanModel.softDeleteManyByUser(...args),
            subscriptionModel.softDeleteManyByUser(...args),
            customPlanModel.softDeleteManyByUser(...args),
            UserStrategyOutcome.softDeleteManyByUser(...args),
          ]);
        },
        {
          // optional, but good defaults
          readPreference: "primary",
          readConcern: { level: "local" },
          writeConcern: { w: "majority" },
        }
      );

      // only emit AFTER a successful commit
      eventBus.emit("userDeleted", { userId });
      return res.json({
        ok: true,
        message: "Account scheduled for deletion (soft-deleted).",
      });
    } catch (err) {
      // retry on transient txn errors
      const labels = new Set(err.errorLabels || []);
      const retryable =
        labels.has("TransientTransactionError") ||
        labels.has("UnknownTransactionCommitResult");
      if (retryable && attempt < 3) {
        continue;
      }
      console.error("deleteUserAccount error:", err);
      return res
        .status(500)
        .json({ ok: false, error: "Failed to delete account" });
    } finally {
      // end session after success OR final failure
      if (attempt === 3) await session.endSession();
    }
  }
}
async function updateUserDetails(req, res) {
  const userId = req.user.id;
  const { personalIncome, totalHouseholdIncome } = req.body;

  const updatedDetails = await UserDetails.findOneAndUpdate(
    { user: userId },
    { personalIncome, totalHouseholdIncome },
    { new: true }
  );

  if (!updatedDetails) {
    return res.status(404).json({ error: "User details not found." });
  }

  res.json(updatedDetails);
}

module.exports = {
  createUserDetails,
  getUserDetails,
  updateUserDetails,
  deleteUserAccount,
};
