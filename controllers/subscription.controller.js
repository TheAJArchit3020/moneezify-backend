const subscriptionModel = require("../models/subscription.model");

async function getSubscriptionStatus(req, res) {
  const userId = req.user.id;
  const subscription = await subscriptionModel
    .findOne({ user: userId })
    .select("-__v")
    .lean();
  if (!subscription) {
    return res.status(404).json({ error: "Subscription not found." });
  }

  if (subscription.status !== "active") {
    return res.status(202).json({ message: "subscription is not active" });
  }
  res.status(200).json(subscription);
}
module.exports = {
  getSubscriptionStatus,
};
