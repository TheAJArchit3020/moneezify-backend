// middlewares/rateLimit.middleware.js
const rateLimit = require("express-rate-limit");
const { ipKeyGenerator } = require("express-rate-limit"); // 👈 import this

function mkLimiter({ windowMs = 30_000, max = 10 } = {}) {
  return rateLimit({
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    // Prefer per-user; fall back to normalized IP using ipKeyGenerator
    keyGenerator: (req) => {
      if (req.user?.id) return `u:${req.user.id}`;
      return `ip:${ipKeyGenerator(req)}`; // 👈 use helper, not req.ip
    },
    message: { ok: false, error: "Too many requests, slow down." },
  });
}

module.exports = { mkLimiter };
