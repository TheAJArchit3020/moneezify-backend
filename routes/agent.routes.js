const express = require("express");

const router = express.Router();
const auth = require("../middlewares/auth.middleware");
const { agentChat } = require("../controllers/openAiChat.controller");

router.post("/chat", auth, agentChat);
module.exports = router;
