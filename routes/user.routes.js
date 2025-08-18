// routes/user.routes.js
const express = require("express");
const {
  createUserDetails,
  getUserDetails,
  updateUserDetails,
  deleteUserAccount,
} = require("../controllers/user.controller");
const auth = require("../middlewares/auth.middleware");
const router = express.Router();

router.post("/details", auth, createUserDetails);
router.get("/details", auth, getUserDetails);
router.post("/delete", auth, deleteUserAccount);
router.put("/details", auth, updateUserDetails);

module.exports = router;
