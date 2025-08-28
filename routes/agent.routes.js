const express = require("express");
const router = express.Router();

const auth = require("../middlewares/auth.middleware");
const subscription = require("../middlewares/subscription.middleware");
const { mkLimiter } = require("../middlewares/rateLimit.middleware");
const { agentChatStream } = require("../controllers/openAiChat.controller");

// per-endpoint rate limit (tune)
const streamLimiter = mkLimiter({ windowMs: 30_000, max: 10 });

// Single SSE endpoint (POST body OR GET ?message=... both work)
router.post("/chat/stream", auth, subscription, streamLimiter, agentChatStream);
router.get("/chat/stream", auth, streamLimiter, agentChatStream);

module.exports = router;
