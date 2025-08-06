const express = require("express");
const router = express.Router();
const auth = require("../middlewares/auth.middleware");
const DashboardSummary = require("../models/dashboardSummary.model");

router.get("/summary", auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const dashboardSummary = await DashboardSummary.findOne({ user: userId });

    if (!dashboardSummary) {
      return res.status(404).json({ message: "Dashboard summary not found" });
    }

    res.json(dashboardSummary);
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
