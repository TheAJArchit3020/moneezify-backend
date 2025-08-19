const OpenAI = require("openai");
const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const { toolsForOpenAI, zodParsers } = require("../agent/tools");

const {
  handle_get_user_debts,
  handle_get_expense_dashboard_summary,
  handle_get_user_details,
  handle_get_expense_categories,
  handle_get_dashboard_summary,
} = require("../agent/handlers");

const SYSTEM = `
You are Moneezify's finance assistant.
Before answering, call tools to fetch ONLY the data you need using includeFields to minimize payload.
- For expense questions: use get_expense_dashboard_summary (month/year).
- For overall debt KPIs and upcoming payments: use get_dashboard_summary.
- For individual debts: use get_user_debts with filtering/sorting and includeFields.
- For budgets/categories: use get_expense_categories.
- For currency/strategy/income context: use get_user_details.
Return concise explanations with amounts prefixed by the user's currency when available.
`;

async function runToolCall(toolCall, userId) {
  const name = toolCall.function.name;
  let rawArgs = {};
  try {
    rawArgs = toolCall.function.arguments
      ? JSON.parse(toolCall.function.arguments)
      : {};
  } catch (_) {
    rawArgs = {};
  }

  // Validate args with Zod
  const schema = zodParsers[name];
  let args;
  try {
    args = schema ? schema.parse(rawArgs) : rawArgs;
  } catch (e) {
    return JSON.stringify({
      error: `Invalid arguments for ${name}`,
      details: e.errors || String(e),
    });
  }

  // Execute handler
  try {
    switch (name) {
      case "get_user_debts":
        return JSON.stringify(await handle_get_user_debts(userId, args));
      case "get_expense_dashboard_summary":
        return JSON.stringify(
          await handle_get_expense_dashboard_summary(userId, args)
        );
      case "get_user_details":
        return JSON.stringify(await handle_get_user_details(userId, args));
      case "get_expense_categories":
        return JSON.stringify(
          await handle_get_expense_categories(userId, args)
        );
      case "get_dashboard_summary":
        return JSON.stringify(await handle_get_dashboard_summary(userId, args));
      default:
        return JSON.stringify({ error: `Unknown tool: ${name}` });
    }
  } catch (err) {
    console.error(`[tool ${name}] error:`, err);
    return JSON.stringify({ error: `Tool ${name} failed` });
  }
}

async function agentChat(req, res) {
  const userId = req.user.id; // from your auth middleware
  const { message } = req.body;

  try {
    // First pass: let the model decide which tools to call
    let first = await client.chat.completions.create({
      model: process.env.OPENAI_MODEL || "gpt-4o-mini",
      messages: [
        { role: "system", content: SYSTEM },
        { role: "user", content: message },
      ],
      tools: toolsForOpenAI,
      tool_choice: "auto",
      temperature: 0.2,
    });

    const toolCalls = first.choices[0]?.message?.tool_calls || [];
    const toolMessages = [];

    // Execute all tool calls
    for (const call of toolCalls) {
      const toolOutput = await runToolCall(call, userId);
      toolMessages.push({
        role: "tool",
        tool_call_id: call.id,
        name: call.function.name,
        content: toolOutput,
      });
    }

    // Second pass: compose the final answer using tool results
    let final = first;
    if (toolMessages.length) {
      final = await client.chat.completions.create({
        model: process.env.OPENAI_MODEL || "gpt-4o-mini",
        messages: [
          { role: "system", content: SYSTEM },
          { role: "user", content: message },
          first.choices[0].message,
          ...toolMessages,
        ],
        temperature: 0.2,
      });
    }

    const text =
      final.choices[0]?.message?.content ||
      "Sorry, I couldn't generate a response.";
    return res.json({ ok: true, answer: text });
  } catch (err) {
    console.error("agentChat error:", err);
    return res.status(500).json({ ok: false, error: "Agent failed" });
  }
}
module.exports = { agentChat };
