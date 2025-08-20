const { QueueEvents } = require("bullmq");
const { agentQueue, connection } = require("../queue/agent.queue");

function sseHeaders(res) {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
}

function send(res, event, data) {
  res.write(`event: ${event}\n`);
  res.write(`data: ${JSON.stringify(data)}\n\n`);
}

async function agentChatStream(req, res) {
  const userId = req.user.id;
  const message = (req.body && req.body.message) || req.query.message || "";

  sseHeaders(res);
  // heartbeat to keep proxies from closing idle streams
  const heartbeat = setInterval(() => res.write(`: keep-alive\n\n`), 15000);

  // enqueue the chat job
  let job;
  try {
    job = await agentQueue.add("chat", { userId, message });
  } catch (e) {
    clearInterval(heartbeat);
    send(res, "error", { message: "Failed to enqueue job" });
    return res.end();
  }

  send(res, "queued", { jobId: job.id });

  // listen for this job's progress/completion
  const events = new QueueEvents("agent", connection);
  await events.waitUntilReady();

  const onProgress = (evt) => {
    if (evt.jobId !== job.id) return;
    // we send tokens from the worker as { type:'token', token:'...' }
    const d = evt.data;
    if (d && d.type === "token" && typeof d.token === "string") {
      send(res, "token", { token: d.token });
    }
  };

  const onCompleted = (evt) => {
    if (evt.jobId !== job.id) return;
    const answer = (evt.returnvalue && evt.returnvalue.answer) || "";
    send(res, "final", { answer });
    send(res, "done", {});
    cleanup();
  };

  const onFailed = (evt) => {
    if (evt.jobId !== job.id) return;
    send(res, "error", { message: evt.failedReason || "Job failed" });
    cleanup();
  };

  function cleanup() {
    try {
      events.off("progress", onProgress);
      events.off("completed", onCompleted);
      events.off("failed", onFailed);
      events.close().catch(() => {});
    } catch (_) {}
    clearInterval(heartbeat);
    res.end();
  }

  events.on("progress", onProgress);
  events.on("completed", onCompleted);
  events.on("failed", onFailed);

  // if client disconnects, stop listening
  req.on("close", cleanup);
}

module.exports = { agentChatStream };
