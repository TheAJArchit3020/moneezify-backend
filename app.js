// app.js (snippet)

const express = require("express");
const authRoutes = require("./routes/auth.routes");
const userRoutes = require("./routes/user.routes");
const payoffPlanRoutes = require("./routes/payoffPlan.routes");
const customPlanRoutes = require("./routes/customPlan.routes");
const debtRoutes = require("./routes/debt.routes");
const app = express();

app.use(express.json());
app.use("/api/auth", authRoutes);
app.use("/api/user", userRoutes);
app.use("/api/plan", payoffPlanRoutes);
app.use("/api/custom-plans", customPlanRoutes);
app.use("/api/debts", debtRoutes);

module.exports = app;
