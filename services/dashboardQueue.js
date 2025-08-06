// services/dashboardQueue.js
const Queue = require("bull");
const redisConfig = require("../config/redis");

const dashboardQueue = new Queue("dashboard", { redis: redisConfig });

// enqueue a rebuild job
function enqueueRebuild(userId) {
  return dashboardQueue.add(
    "rebuild",
    { userId },
    {
      attempts: 3, // retry up to 3 times
      backoff: 5000, // wait 5s between retries
    }
  );
}

module.exports = { dashboardQueue, enqueueRebuild };
