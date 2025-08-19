const { OAuth2Client } = require("google-auth-library");
const jwt = require("jsonwebtoken");
const User = require("../models/user.model");
const userDetailsModel = require("../models/userDetails.model");
const debtModel = require("../models/debt.model");
const debtTransactionModel = require("../models/debtTransaction.model");
const expenseCategoryModel = require("../models/expenseCategory.model");
const expenseEntryModel = require("../models/expenseEntry.model");
const monthlyExpenseSummaryModel = require("../models/monthlyExpenseSummary.model");
const expenseDashboardSummaryModel = require("../models/expenseDashboardSummary.model");
const dashboardSummaryModel = require("../models/dashboardSummary.model");
const payoffPlanModel = require("../models/payoffPlan.model");
const subscriptionModel = require("../models/subscription.model");
const customPlanModel = require("../models/customPlan.model");
const userStrategyOutcomeModel = require("../models/userStrategyOutcome.model");
const mongoose = require("mongoose");
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

async function googleSignIn(req, res) {
  const { idToken } = req.body;
  if (!idToken)
    return res.status(400).json({ error: "Authentication Required" });

  // 1) Verify with Google
  let payload;
  try {
    const ticket = await googleClient.verifyIdToken({
      idToken,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    payload = ticket.getPayload();
  } catch (err) {
    return res.status(401).json({ error: "Incorrect Authentication" });
  }

  // 2) Find or create auth user
  let user = await User.findOne({ googleId: payload.sub });
  if (!user) {
    const deleted = await User.findOne({ googleId: payload.sub }).withDeleted();
    if (
      deleted &&
      deleted.isDeleted &&
      (!deleted.purgeAt || deleted.purgeAt > new Date())
    ) {
      await restoreUserAccount(deleted._id);
      user = await User.findById(deleted._id);
    } else {
      // 3) Create fresh
      user = await User.create({ email: payload.email, googleId: payload.sub });
    }
  }

  // 3) Issue your own JWT
  const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, {
    expiresIn: "30d",
  });

  // 4) Tell front‑end whether details exist
  let details = null;
  if (user.detailsRef) {
    details = await userDetailsModel.findById(user.detailsRef).lean();
  }

  res.json({
    token,
    userId: user._id,
    detailsExists: Boolean(details),
    details, // will be `null` if no details yet
  });
}

async function restoreUserAccount(userId) {
  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      await User.updateOne(
        { _id: userId },
        { $set: { isDeleted: false }, $unset: { deletedAt: "", purgeAt: "" } },
        { session }
      );

      await Promise.all([
        userDetailsModel.restoreManyByUser(userId, session),
        debtModel.restoreManyByUser(userId, session),
        debtTransactionModel.restoreManyByUser(userId, session),
        expenseCategoryModel.restoreManyByUser(userId, session),
        expenseEntryModel.restoreManyByUser(userId, session),
        monthlyExpenseSummaryModel.restoreManyByUser(userId, session),
        expenseDashboardSummaryModel.restoreManyByUser(userId, session),
        dashboardSummaryModel?.restoreManyByUser?.(userId, session) ??
          Promise.resolve(),
        payoffPlanModel.restoreManyByUser(userId, session),
        subscriptionModel.restoreManyByUser(userId, session),
        customPlanModel.restoreManyByUser(userId, session),
        userStrategyOutcomeModel.restoreManyByUser(userId, session),
      ]);
    });
  } finally {
    await session.endSession();
  }
}

async function devLogin(req, res) {
  if (process.env.NODE_ENV !== "development") {
    return res.status(403).json({ error: "Dev login disabled" });
  }
  const { email, googleId, appleId } = req.body;
  if (!email) return res.status(400).json({ error: "Missing email" });

  // find or create user
  let user = await User.findOne({ email });
  if (!user) {
    user = await User.create({ email, googleId, appleId });
  }

  // issue JWT
  const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, {
    expiresIn: "30d",
  });

  res.json({
    token,
    userId: user._id,
    detailsExists: Boolean(user.detailsRef),
  });
}

module.exports = { googleSignIn, devLogin };
