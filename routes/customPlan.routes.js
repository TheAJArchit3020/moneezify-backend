const express = require("express");
const router = express.Router();
const auth = require("../middlewares/auth.middleware");
const { createCustomPlan } = require("../controllers/customPlan.controller");

router.post("/", auth, createCustomPlan);

module.exports = router;
