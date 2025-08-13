// routes/payoffplan.routes.js
const express = require("express");
const router = express.Router();
const auth = require("../middlewares/auth.middleware");
const {
  selectStrategy,
  getPayoffPlan,
  getStrategyOutcomes,
} = require("../controllers/payoffPlan.controller");
const {
  requireSubscription,
} = require("../middlewares/subscription.middleware");

router.post("/select", auth, selectStrategy);

router.get("/", auth, getPayoffPlan);

router.get("/outcomes", auth, getStrategyOutcomes);

module.exports = router;
