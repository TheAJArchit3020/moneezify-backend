// routes/payoffplan.routes.js
const express = require("express");
const router = express.Router();
const auth = require("../middlewares/auth.middleware");
const { selectStrategy } = require("../controllers/payoffPlan.controller");

router.post("/select", auth, selectStrategy);

module.exports = router;
