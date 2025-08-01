// services/simulateStrategyOutcome.js
/**
 * Simulates repayment with a given strategy in-memory and returns summary.
 * Does NOT persist any transactions.
 */

function addMonths(date, n) {
  const d = new Date(date);
  const day = d.getDate();
  d.setMonth(d.getMonth() + n);
  if (d.getDate() !== day) d.setDate(0);
  return d;
}

/**
 * @param {Array}  debts  Array of { id, balance, minPaymentAmount, apr, nextDueDate }
 * @param {Number} income  Monthly income
 * @param {Number} totalExpenses  Monthly living expenses
 * @param {String} strategy  'avalanche'|'snowball'|'custom'
 */
function simulateStrategyOutcome(
  debts,
  income,
  totalExpenses,
  strategy,
  customOrder = [],
  extraPayments = []
) {
  console.log(totalExpenses);
  // Deep copy so we don’t touch original debts
  const sims = debts.map((d) => ({
    id: d._id,
    balance: d.balance,
    minPayment: d.minPaymentAmount,
    apr: d.apr,
    dueDate: new Date(d.nextDueDate),
  }));

  // Extra pool available each month after living costs and min payments
  const sumMin = sims.reduce((sum, d) => sum + d.minPayment, 0);
  let extraPool = Math.max(0, income - totalExpenses - sumMin);

  let totalInterest = 0;
  let lastDueDate = null;
  const maxIterations = 1200; // safety cap
  let iter = 0;

  while (sims.some((d) => d.balance > 0) && iter++ < maxIterations) {
    // 1) Order debts
    if (strategy === "avalanche") {
      sims.sort((a, b) => b.apr - a.apr);
    } else if (strategy === "snowball") {
      sims.sort((a, b) => a.balance - b.balance);
    } else if (strategy === "custom" && customOrder.length) {
      ordered = customOrder
        .map((id) => sims.find((d) => d.id === id.toString()))
        .filter(Boolean);
    } // custom = original order

    // 2) One month of payments
    for (let i = 0; i < sims.length; i++) {
      const d = sims[i];
      if (d.balance <= 0) continue;

      const opening = d.balance;
      const interest = +((opening * (d.apr / 100)) / 12).toFixed(2);
      totalInterest += interest;

      // Base payment
      let payment = d.minPayment;
      // Throw extra pool at the first debt in the order
      if (strategy === "custom") {
        // find any extraPayment for this debt
        const ep = extraPayments.find((x) => x.debt.toString() === d.id);
        if (ep) payment += ep.extraAmount;
      } else if (i === 0 && extraPool > 0) {
        // avalanche/snowball throw extraPool at first debt
        payment += extraPool;
      }

      // Final payment cap
      if (opening + interest <= payment) {
        payment = +(opening + interest).toFixed(2);
      }

      const principal = +(payment - interest).toFixed(2);
      d.balance = +(opening - principal).toFixed(2);

      // Track the last due date
      lastDueDate = new Date(d.dueDate);

      // Prepare next dueDate
      d.dueDate = addMonths(d.dueDate, 1);
    }
  }

  // For totalSavings, compare to no-extra scenario:
  // simulate again with extraPool=0 to get interestNoExtra:
  let interestNoExtra = 0;
  sims.forEach(
    (_, idx) =>
      (sims[idx] = {
        ...debts[idx],
        balance: debts[idx].balance,
        minPayment: debts[idx].minPaymentAmount,
        apr: debts[idx].apr,
        dueDate: new Date(debts[idx].nextDueDate),
      })
  );
  iter = 0;
  while (sims.some((d) => d.balance > 0) && iter++ < maxIterations) {
    if (strategy === "avalanche") sims.sort((a, b) => b.apr - a.apr);
    else if (strategy === "snowball")
      sims.sort((a, b) => a.balance - b.balance);
    for (const d of sims) {
      if (d.balance <= 0) continue;
      const opening = d.balance;
      const interest = +((opening * (d.apr / 100)) / 12).toFixed(2);
      interestNoExtra += interest;
      let payment = d.minPayment;
      if (opening + interest <= payment)
        payment = +(opening + interest).toFixed(2);
      const principal = +(payment - interest).toFixed(2);
      d.balance = +(opening - principal).toFixed(2);
      d.dueDate = addMonths(d.dueDate, 1);
    }
  }

  return {
    estimatedDebtFreeDate: lastDueDate,
    totalInterestPaid: +totalInterest.toFixed(2),
    totalSavings: +(interestNoExtra - totalInterest).toFixed(2),
  };
}

module.exports = simulateStrategyOutcome;
