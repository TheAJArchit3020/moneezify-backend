// app.js (snippet)

const express = require("express");
require("./eventListeners/dashboardListener");
require("./eventListeners/expenseDashboardlistener");
const authRoutes = require("./routes/auth.routes");
const userRoutes = require("./routes/user.routes");
const payoffPlanRoutes = require("./routes/payoffPlan.routes");
const customPlanRoutes = require("./routes/customPlan.routes");
const debtRoutes = require("./routes/debt.routes");
const transactionRoutes = require("./routes/transaction.routes");
const SubscriptionRoutes = require("./routes/subscription.routes");
const swaggerUi = require("swagger-ui-express");
const swaggerFile = require("./swagger-output.json");

const app = express();
require("express-oas-generator").init(app, {});
app.use(express.json());
require("./swagger.js")(app);
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerFile));
app.get("/api/ping", (req, res) => {
  res.send("pong");
});
app.use("/api/auth", authRoutes);
app.use("/api/user", userRoutes);
app.use("/api/plan", payoffPlanRoutes);
app.use("/api/custom-plans", customPlanRoutes);
app.use("/api/debts", debtRoutes);
app.use("/api/transaction", transactionRoutes);
app.use("/api/expenses", require("./routes/expenses.routes"));
app.use("/api/categories", require("./routes/category.routes"));
app.use("/api/dashboard", require("./routes/dashboard.routes"));

app.use("/api/survey", require("./routes/survey.routes"));
app.use("/api/subscription", require("./routes/subscription.routes"));

module.exports = app;
