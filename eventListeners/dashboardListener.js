// src/events/dashboardListener.js
const eventBus = require("../events/eventBus");
const { enqueueRebuild } = require("../services/dashboardQueue");

eventBus.on("dataChanged", ({ userId }) => {
  console.log(`Enqueueing dashboard rebuild for user ${userId}`);
  enqueueRebuild(userId)
    .then((job) => console.log(`Job ${job.id} queued for user ${userId}`))
    .catch((err) => console.error("Failed to enqueue rebuild:", err));
});
