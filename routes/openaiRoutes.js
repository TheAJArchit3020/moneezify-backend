const express = require("express");

const router = express.Router();
const auth = require("../middlewares/auth.middleware");
const { OpenAiChat } = require("../controllers/openAiChat.controller");

router.post("/chat", auth, OpenAiChat);
