// services/subscription.service.js
const Subscription = require("../models/subscription.model");
const AppConfig = require("../models/appConfig.model");

async function startTrial(userId) {
  // create or upsert a trial‐flag subscription
  console.log("Starting Trial");
  const cfg = await AppConfig.findOne({ key: "trial" });
  if (!cfg?.value) return;
  try {
    await Subscription.findOneAndUpdate(
      { user: userId, platform: "trial" },
      { user: userId, platform: "trial", isTrial: true, status: "active" },
      { upsert: true }
    );
    console.log("Subsacription Started");
  } catch (error) {
    console.log("Subscription Failed");
  }
}
// returns true if user may access premium features
async function checkAccess(userId) {
  const cfg = await AppConfig.findOne({ key: "trial" });
  // if trial period is on, grant access to ANY trial user
  if (cfg?.value?.active) {
    const trialSub = await Subscription.findOne({
      user: userId,
      platform: "trial",
      status: "active",
    });
    if (trialSub) return true;
  }
  // otherwise require a paid subscription
  const paidSub = await Subscription.findOne({
    user: userId,
    platform: { $in: ["apple", "google"] },
    status: "active",
  });
  return !!paidSub;
}

module.exports = { startTrial, checkAccess };
