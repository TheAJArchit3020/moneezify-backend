const express = require("express");
const router = express.Router();
const auth = require("../middlewares/auth.middleware");
const {
  createCustomPlan,
  getDefaultCustomPlan,
  previewCustomPlan,
} = require("../controllers/customPlan.controller");

router.post("/", auth, createCustomPlan);
router.get("/", auth, getDefaultCustomPlan);
router.post("/preview", auth, previewCustomPlan);

module.exports = router;
