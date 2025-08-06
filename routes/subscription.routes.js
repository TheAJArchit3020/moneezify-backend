const express = require("express");
const auth = require("../middlewares/auth.middleware");
const {
  getSubscriptionStatus,
} = require("../controllers/subscription.controller");
const router = express.Router();

router.get("/", auth, getSubscriptionStatus);
module.exports = router;
