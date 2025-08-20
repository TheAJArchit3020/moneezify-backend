require("dotenv").config();
const { Worker } = require("bullmq");
const { connection } = require("../queue/agent.queue");
const OpenAI = require("openai");
const connectDB = require("../config/db");
const {
  prepareStreamPass, // new helper below
  runToolCall,
  SYSTEM,
  toolsForOpenAI,
} = require("../services/agent.service");

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

async function start() {
  await connectDB();
  const worker = new Worker(
    "agent",
    async (job) => {
      const { userId, message } = job.data;
      let answer = "";

      // First pass (tools):
      const { first, toolMessages } = await prepareStreamPass(userId, message);

      // Second pass: stream tokens and push each token via job.updateProgress
      if (toolMessages.length) {
        const stream = await client.chat.completions.create({
          model: process.env.OPENAI_MODEL || "gpt-4o-mini",
          stream: true,
          messages: [
            { role: "system", content: SYSTEM },
            { role: "user", content: message },
            first.choices[0].message,
            ...toolMessages,
          ],
          temperature: 0.2,
        });

        for await (const chunk of stream) {
          const token = chunk?.choices?.[0]?.delta?.content;
          if (token) {
            answer += token;
            await job.updateProgress({ type: "token", token });
          }
        }
      } else {
        // No tools needed: one-pass stream
        const stream = await client.chat.completions.create({
          model: process.env.OPENAI_MODEL || "gpt-4o-mini",
          stream: true,
          messages: [
            { role: "system", content: SYSTEM },
            { role: "user", content: message },
          ],
          temperature: 0.2,
        });

        for await (const chunk of stream) {
          const token = chunk?.choices?.[0]?.delta?.content;
          if (token) {
            answer += token;
            await job.updateProgress({ type: "token", token });
          }
        }
      }

      // Return the full text for 'completed' event
      return { answer };
    },
    {
      ...connection,
      concurrency: 8, // tune
    }
  );

  worker.on("failed", (job, err) => {
    console.error("agent job failed", job?.id, err);
  });
  worker.on("completed", (job) => {
    console.log("agent job completed", job.id);
  });
}
start().catch((e) => {
  console.error("Worker bootstrap failed:", e);
  process.exit(1);
});
