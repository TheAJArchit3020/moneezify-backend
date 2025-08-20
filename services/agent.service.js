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

/**
 * Runs ONLY the first pass (lets the model decide tool calls and executes them),
 * returns objects needed for the streaming second pass.
 */
async function prepareStreamPass(userId, message) {
  const first = await client.chat.completions.create({
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

  if (toolCalls.length) {
    const outputs = await Promise.all(
      toolCalls.map((c) => runToolCall(c, userId))
    );
    for (let i = 0; i < toolCalls.length; i++) {
      toolMessages.push({
        role: "tool",
        tool_call_id: toolCalls[i].id,
        name: toolCalls[i].function.name,
        content: outputs[i],
      });
    }
  }
  return { first, toolMessages };
}

module.exports = {
  SYSTEM,
  toolsForOpenAI,
  runToolCall,
  prepareStreamPass,
};
