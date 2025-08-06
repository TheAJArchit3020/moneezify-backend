// src/events/expenseDashboardListener.js
const eventBus = require("../events/eventBus");
const {
  rebuildExpenseDashboard,
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
eventBus.on("categoryChanged", ({ userId }) => {
  const today = new Date();
  eventBus.emit("expenseChanged", {
    userId,
    year: today.getFullYear(),
    month: today.getMonth() + 1,
  });
});
