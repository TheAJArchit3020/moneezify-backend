// routes/payoffplan.routes.js
const express = require("express");
const router = express.Router();
const auth = require("../middlewares/auth.middleware");
const {
  selectStrategy,
  getPayoffPlan,
} = require("../controllers/payoffPlan.controller");
const {
  requireSubscription,
} = require("../middlewares/subscription.middleware");

router.post("/select", auth, selectStrategy);

router.get("/", auth, getPayoffPlan);

router.post(
  "/select/moneezifyai",
  auth,
  requireSubscription,
  selectMoneezifyAI
);

module.exports = router;
