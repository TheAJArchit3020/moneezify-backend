// middlewares/subscription.middleware.js
const { checkAccess } = require("../services/subscription.service");

module.exports = async function requireSubscription(req, res, next) {
  if (await checkAccess(req.user.id)) {
    return next();
  }
  return res.status(402).json({ error: "Subscription required." });
};
