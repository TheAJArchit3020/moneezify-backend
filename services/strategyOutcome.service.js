// services/strategyOutcome.service.js
const UserStrategyOutcome = require("../models/userStrategyOutcome.model");
const generateFullPlan = require("./planGenerator");

/**
 * Compute outcomes for a set of strategies (parallel), without touching DB.
 * Falls back gracefully if custom inputs are missing.
 */
async function computeStrategyOutcomes({
  debts,
  income,
  totalExpenses,
  preview = true,
  customOrder = [],
  extraPayments = [],
}) {
  if (!Array.isArray(debts) || debts.length === 0) {
    return { avalanche: null, snowball: null, hybrid: null, custom: null };
  }

  // Use given customOrder or default to input order
  const safeCustomOrder =
    Array.isArray(customOrder) && customOrder.length
      ? customOrder.map(String)
      : debts.map((d) => (d._id || d.id).toString());

  const [avalanche, snowball, hybrid, custom] = await Promise.all([
    generateFullPlan({
      debts,
      income,
      totalExpenses,
      strategy: "avalanche",
      preview,
    }),
    generateFullPlan({
      debts,
      income,
      totalExpenses,
      strategy: "snowball",
      preview,
    }),
    generateFullPlan({
      debts,
      income,
      totalExpenses,
      strategy: "hybrid",
      preview,
    }),
    generateFullPlan({
      debts,
      income,
      totalExpenses,
      strategy: "custom",
      customOrder: safeCustomOrder,
      extraPayments: Array.isArray(extraPayments) ? extraPayments : [],
      preview,
    }),
  ]);

  return { avalanche, snowball, hybrid, custom };
}

/**
 * Upsert the outcomes for a user.
 */
async function upsertUserStrategyOutcome(userId, outcomes) {
  return UserStrategyOutcome.findOneAndUpdate({ user: userId }, outcomes, {
    upsert: true,
    new: true,
  });
}

/**
 * One-shot helper used by controllers: compute all + upsert.
 */
async function computeAndUpsertStrategyOutcomes({
  userId,
  debts,
  income,
  totalExpenses,
  preview = true,
  customOrder = [],
  extraPayments = [],
}) {
  const outcomes = await computeStrategyOutcomes({
    debts,
    income,
    totalExpenses,
    preview,
    customOrder,
    extraPayments,
  });

  const doc = await upsertUserStrategyOutcome(userId, outcomes);
  return { outcomes, doc };
}

module.exports = {
  computeStrategyOutcomes,
  upsertUserStrategyOutcome,
  computeAndUpsertStrategyOutcomes,
};
