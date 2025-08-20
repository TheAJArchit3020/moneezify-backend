const { agentQueue } = require("../queue/agent.queue");

async function enqueueAgentChat(req, res) {
  const userId = req.user.id;
  const { message } = req.body;
  try {
    const job = await agentQueue.add("chat", { userId, message });
    res.json({ ok: true, jobId: job.id });
  } catch (e) {
    console.error("enqueueAgentChat error:", e);
    res.status(500).json({ ok: false, error: "Failed to enqueue" });
  }
}
async function getAgentChatStatus(req, res) {
  const { id } = req.params;
  try {
    const job = await agentQueue.getJob(id);
    if (!job) return res.status(404).json({ ok: false, status: "not_found" });

    const state = await job.getState();
    if (state === "completed")
      return res.json({
        ok: true,
        status: "completed",
        result: job.returnvalue,
      });
    if (state === "failed") return res.json({ ok: true, status: "failed" });
    return res.json({ ok: true, status: state });
  } catch (e) {
    console.error("getAgentChatStatus error:", e);
    res.status(500).json({ ok: false, error: "Failed to get status" });
  }
}

module.exports = { enqueueAgentChat, getAgentChatStatus };
