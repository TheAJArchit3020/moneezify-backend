// agent/tools.js
const { z } = require("zod");
const { zodToJsonSchema } = require("zod-to-json-schema");

const debtsSelectable = [
  "_id",
  "name",
  "creditorName",
  "principal",
  "balance",
  "minPaymentAmount",
  "apr",
  "nextDueDate",
  "tagColor",
  "debtPaidOff",
  "createdAt",
  "updatedAt",
];

const edsSelectable = [
  "year",
  "month",
  "totalBudget",
  "totalSpent",
  "byCategory",
  "recentExpenses",
  "spendingTrend",
  "createdAt",
  "updatedAt",
];

const detailsSelectable = [
  "name",
  "email",
  "phoneNumber",
  "age",
  "profession",
  "personalIncome",
  "totalHouseholdIncome",
  "approxMonthlyExpenses",
  "selectedCurrency",
  "currentStrategy",
  "createdAt",
  "updatedAt",
];

const catSelectable = [
  "_id",
  "name",
  "color",
  "budget",
  "isDefault",
  "createdAt",
  "updatedAt",
];

const dashSelectable = [
  "debtFreeDate",
  "payoffPct",
  "totalBalance",
  "totalDebtPaid",
  "balanceByDebt",
  "upcomingTransactions",
  "createdAt",
  "updatedAt",
];

const GetUserDebtsSchema = z
  .object({
    onlyOpen: z
      .boolean()
      .default(true)
      .describe("If true, only return debts with balance > 0"),
    minApr: z.number().describe("Filter: APR >= this value").optional(),
    sortBy: z
      .enum([
        "apr_desc",
        "apr_asc",
        "balance_desc",
        "balance_asc",
        "minpay_desc",
        "minpay_asc",
        "created_desc",
        "created_asc",
      ])
      .default("apr_desc")
      .describe("Sort order."),
    includeFields: z
      .array(z.enum(debtsSelectable))
      .optional()
      .describe("Optional field whitelist for each debt."),
    limit: z
      .number()
      .int()
      .min(1)
      .max(200)
      .default(200)
      .describe("Max number of debts to return."),
  })
  .describe("Return the user's debts with filters and field selection.");

const GetExpenseDashboardSummarySchema = z
  .object({
    year: z
      .number()
      .int()
      .optional()
      .describe("Year, e.g. 2025. Defaults to current year."),
    month: z
      .number()
      .int()
      .min(1)
      .max(12)
      .optional()
      .describe("Month 1..12. Defaults to current month."),
    includeFields: z
      .array(z.enum(edsSelectable))
      .optional()
      .describe("Optional field whitelist on the summary document."),
    recentLimit: z
      .number()
      .int()
      .min(1)
      .max(200)
      .default(20)
      .describe("Trim recentExpenses to last N entries."),
    trendTail: z
      .number()
      .int()
      .min(1)
      .max(366)
      .default(90)
      .describe("Keep last N points in spendingTrend."),
    fallbackToLatest: z
      .boolean()
      .default(true)
      .describe(
        "If requested month not found, return the latest available summary."
      ),
  })
  .describe(
    "Return monthly expense summary (totals, byCategory, recentExpenses, spendingTrend)."
  );

const GetUserDetailsSchema = z
  .object({
    includeFields: z
      .array(z.enum(detailsSelectable))
      .optional()
      .describe("Optional field whitelist."),
  })
  .describe("Return user profile details (income, strategy, currency, etc).");

const GetExpenseCategoriesSchema = z
  .object({
    includeFields: z
      .array(z.enum(catSelectable))
      .optional()
      .describe("Optional field whitelist."),
    limit: z
      .number()
      .int()
      .min(1)
      .max(500)
      .default(200)
      .describe("Max number of categories to return."),
  })
  .describe("Return the user's expense categories with budgets/colors.");

const GetDashboardSummarySchema = z
  .object({
    includeFields: z
      .array(z.enum(dashSelectable))
      .optional()
      .describe("Optional field whitelist."),
    upcomingLimit: z
      .number()
      .int()
      .min(1)
      .max(20)
      .default(3)
      .describe("Trim upcomingTransactions to N items."),
    balanceLimit: z
      .number()
      .int()
      .min(1)
      .max(200)
      .default(50)
      .describe("Trim balanceByDebt to N items."),
  })
  .describe(
    "Return the user's dashboard snapshot (debt KPIs, upcoming transactions)."
  );

// ----- Convert to OpenAI tool JSON Schemas -----
function toolFromZod(name, description, zodSchema) {
  let json = zodToJsonSchema(zodSchema, { name, $refStrategy: "none" });

  // OpenAI requires parameters to be a JSON Schema with type: "object"
  // If for any reason 'type' isn't present, coerce it
  if (!json || json.type !== "object") {
    // Some versions produce { properties, required } but no 'type'
    if (json && json.properties) {
      json = { type: "object", ...json };
    } else {
      // last-resort fallback (shouldn’t happen with object schemas)
      json = { type: "object", properties: {} };
    }
  }
  return {
    type: "function",
    function: {
      name,
      description,
      parameters: json, // JSON Schema that OpenAI expects
    },
  };
}

const toolsForOpenAI = [
  toolFromZod(
    "get_user_debts",
    GetUserDebtsSchema.description,
    GetUserDebtsSchema
  ),
  toolFromZod(
    "get_expense_dashboard_summary",
    GetExpenseDashboardSummarySchema.description,
    GetExpenseDashboardSummarySchema
  ),
  toolFromZod(
    "get_user_details",
    GetUserDetailsSchema.description,
    GetUserDetailsSchema
  ),
  toolFromZod(
    "get_expense_categories",
    GetExpenseCategoriesSchema.description,
    GetExpenseCategoriesSchema
  ),
  toolFromZod(
    "get_dashboard_summary",
    GetDashboardSummarySchema.description,
    GetDashboardSummarySchema
  ),
];

const zodParsers = {
  get_user_debts: GetUserDebtsSchema,
  get_expense_dashboard_summary: GetExpenseDashboardSummarySchema,
  get_user_details: GetUserDetailsSchema,
  get_expense_categories: GetExpenseCategoriesSchema,
  get_dashboard_summary: GetDashboardSummarySchema,
};

module.exports = {
  toolsForOpenAI,
  zodParsers,
  // (export field lists in case handlers want them)
  _fieldLists: {
    debtsSelectable,
    edsSelectable,
    detailsSelectable,
    catSelectable,
    dashSelectable,
  },
};
