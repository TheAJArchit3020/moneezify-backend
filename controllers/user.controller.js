const User = require("../models/user.model");
const UserDetails = require("../models/userDetails.model");
const Debt = require("../models/debt.model");
const UserStrategyOutcome = require("../models/userStrategyOutcome.model");
const generateFullPlan = require("../services/planGenerator");
const {
  seedDefaultCategoriesForUser,
} = require("../services/category.service");
const { selectStrategy } = require("./payoffPlan.controller");
const { regeneratePlanForUser } = require("../services/plan.service");
const eventBus = require("../events/eventBus");

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

  const ai = await generateFullPlan({
    debts: createdDebts,
    income: personalIncome + totalHouseholdIncome,
    totalExpenses: totalApproxExpenses,
    strategy: "snowball",
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
    { avalanche: av, snowball: sb, ai, custom: cu },
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

module.exports = { createUserDetails, getUserDetails };
