// routes/transaction.routes.js
const express = require("express");
const auth = require("../middlewares/auth.middleware");
const {
  logPayment,
  getTransaction,
  saveNote,
} = require("../controllers/transaction.controller");
const router = express.Router();

router.post("/:id/log", auth, logPayment);
router.get("/:id/", auth, getTransaction);
router.post("/:id/save-note", auth, saveNote);

module.exports = router;
