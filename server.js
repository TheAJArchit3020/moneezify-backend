require("dotenv").config(); // load .env into process.env
const connectDB = require("./config/db");
const app = require("./app"); // your Express app from app.js
const mongoose = require("mongoose");
const customPlanModel = require("./models/customPlan.model");
const dashboardSummaryModel = require("./models/dashboardSummary.model");
const debtModel = require("./models/debt.model");
const debtTransactionModel = require("./models/debtTransaction.model");
const expenseCategoryModel = require("./models/expenseCategory.model");
const expenseDashboardSummaryModel = require("./models/expenseDashboardSummary.model");
const expenseEntryModel = require("./models/expenseEntry.model");
const monthlyExpenseSummaryModel = require("./models/monthlyExpenseSummary.model");
const payoffPlanModel = require("./models/payoffPlan.model");
const subscriptionModel = require("./models/subscription.model");
const userStrategyOutcomeModel = require("./models/userStrategyOutcome.model");
const userModel = require("./models/user.model");
const userDetailsModel = require("./models/userDetails.model");

const PORT = process.env.PORT || 5000;

(async () => {
  // 1) Connect to MongoDB
  await connectDB();

  await Promise.all([
    customPlanModel.syncIndexes(),
    dashboardSummaryModel.syncIndexes(),
    debtModel.syncIndexes(),
    debtTransactionModel.syncIndexes(),
    expenseCategoryModel.syncIndexes(),
    expenseDashboardSummaryModel.syncIndexes(),
    expenseEntryModel.syncIndexes(),
    monthlyExpenseSummaryModel.syncIndexes(),
    payoffPlanModel.syncIndexes(),
    subscriptionModel.syncIndexes(),
    userStrategyOutcomeModel.syncIndexes(),
    userModel.syncIndexes(),
    userDetailsModel.syncIndexes(),
  ]);

  // 2) Start Express server
  app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
  });
})();
