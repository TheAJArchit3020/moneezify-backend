// src/events/expenseDashboardListener.js
const eventBus = require("../events/eventBus");
const {
  rebuildExpenseDashboard,
  rebuildAllExpenseDashboardsForUser,
} = require("../services/expenseDashboard.service");

// Debounce updates per user/month
const pending = new Map();

eventBus.on("expenseChanged", ({ userId, year, month }) => {
  const key = `${userId}:${year}:${month}`;
  clearTimeout(pending.get(key));
  pending.set(
    key,
    setTimeout(() => {
      rebuildExpenseDashboard(userId, year, month)
        .then(() => console.log(`Rebuilt expense dashboard ${key}`))
        .catch((err) =>
          console.error(`Expense dashboard rebuild failed ${key}`, err)
        );
      pending.delete(key);
    }, 500)
  ); // batch rapid events
});
eventBus.on("categoryChanged", async ({ userId }) => {
  try {
    await rebuildAllExpenseDashboardsForUser(userId);
    console.log(`Rebuilt expense dashboards for user ${userId}`);
  } catch (e) {
    console.error("rebuildAllExpenseDashboardsForUser failed:", e);
  }
});
