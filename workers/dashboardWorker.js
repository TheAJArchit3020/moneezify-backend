// workers/dashboardWorker.js
require("dotenv").config();

// 1) Import and run your DB connector before anything else
const connectDB = require("../config/db");
connectDB()
  .then(() => {
    console.log("✅ Worker connected to MongoDB, starting dashboard queue…");

    // 2) Now import the queue and service
    const { dashboardQueue } = require("../services/dashboardQueue");
    const { rebuildDashboardForUser } = require("../services/dashboardService");

    // 3) Process jobs
    const CONCURRENCY = 5;
    dashboardQueue.process("rebuild", CONCURRENCY, async (job) => {
      const { userId } = job.data;
      try {
        await rebuildDashboardForUser(userId);
      } catch (err) {
        console.error(`Dashboard rebuild failed for ${userId}:`, err);
        throw err;
      }
    });

    // 4) Optional logging
    dashboardQueue.on("completed", (job) =>
      console.log(`✅ Dashboard rebuilt for user ${job.data.userId}`)
    );
    dashboardQueue.on("failed", (job, err) =>
      console.error(`❌ Dashboard rebuild failed for ${job.data.userId}:`, err)
    );
  })
  .catch((err) => {
    console.error("❌ Worker failed to connect to MongoDB:", err);
    process.exit(1);
  });
