// queue/agent.queue.js
const { Queue } = require("bullmq");
const connection = { connection: { url: process.env.REDIS_URL } };

const agentQueue = new Queue("agent", {
  ...connection,
  defaultJobOptions: {
    removeOnComplete: 500,
    removeOnFail: 200,
    attempts: 2,
    backoff: { type: "exponential", delay: 500 },
    timeout: 60_000, // hard cap per job
  },
});

module.exports = { agentQueue, connection };
