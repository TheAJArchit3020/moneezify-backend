// routes/user.routes.js
const express = require("express");
const {
  createUserDetails,
  getUserDetails,
} = require("../controllers/user.controller");
const auth = require("../middlewares/auth.middleware");
const router = express.Router();

router.post("/details", auth, createUserDetails);
router.get("/details", auth, getUserDetails);

module.exports = router;
