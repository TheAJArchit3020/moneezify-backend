const express = require("express");
const router = express.Router();
const auth = require("../middlewares/auth.middleware");
const {
  createCustomPlan,
  getDefaultCustomPlan,
  previewCustomPlan,
  getUserCustomPlans,
} = require("../controllers/customPlan.controller");
const subscription = require("../middlewares/subscription.middleware");
router.post("/", auth, subscription, createCustomPlan);
router.get("/", auth, getDefaultCustomPlan);
router.post("/preview", auth, previewCustomPlan);
router.get("/all", auth, getUserCustomPlans);

module.exports = router;
