// routes/survey.routes.js
const express = require("express");
const auth = require("../middlewares/auth.middleware");
const ctl = require("../controllers/survey.controller");
const router = express.Router();

router.get("/", auth, ctl.listQuestions);
router.post("/", auth, ctl.submitResponses);

module.exports = router;
