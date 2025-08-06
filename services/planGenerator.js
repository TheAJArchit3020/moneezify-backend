const DebtTransaction = require("../models/debtTransaction.model");

/**
 * Add n months to a JS Date, clamping to month-end if needed.
 */
function addMonths(date, n) {
  const d = new Date(date);
  const day = d.getDate();
  d.setMonth(d.getMonth() + n);
  if (d.getDate() !== day) {
    d.setDate(0);
  }
  return d;
}

/**
 * Generates a payoff plan for Avalanche or Snowball.
 *
 * @param {Object} args
 * @param {String} args.userId             – user._id
 * @param {Object} args.details            – { personalIncome, totalHouseholdIncome, budgets }
 * @param {Array}  args.debts              – array of debt docs with {_id, balance, apr, minPaymentAmount, nextDueDate}
 * @param {String} args.strategy           – 'avalanche' or 'snowball'
 * @returns {Object} { transactionIds, estimatedDebtFreeDate, totalInterestPaid, totalSavings }
 */

async function generateFullPlan(opts) {
  const {
    userId,
    debts,
    income,
    totalExpenses,
    strategy,
    customOrder = [],
    extraPayments = [],
    preview = false,
  } = opts;
  if (!preview) {
    await DebtTransaction.deleteMany({
      user: userId,
      status: { $ne: "paid" },
    });
  }
  // 2) Compute the extra pool available each month
  const sumMin = debts.reduce((sum, d) => sum + d.minPaymentAmount, 0);
  const extraPoolInit = Math.max(0, income - totalExpenses - sumMin);
  const sims = debts.map((d) => ({
    id: d._id.toString(),
    balance: d.balance,
    minPayment: d.minPaymentAmount,
    apr: d.apr,
    dueDate: new Date(d.nextDueDate),
  }));

  let totalInterest = 0;
  let lastDueDate = null;
  let iter = 0,
    maxIter = 1200;

  // 4) Monthly loop
  while (sims.some((d) => d.balance > 0) && iter++ < maxIter) {
    // determine extra pool for this month
    let extraPool = extraPoolInit;

    // 4a) order debts
    let ordered = sims;
    if (strategy === "avalanche" || strategy === "ai") {
      ordered = sims.slice().sort((a, b) => b.apr - a.apr);
    } else if (strategy === "snowball") {
      ordered = sims.slice().sort((a, b) => a.balance - b.balance);
    } else if (strategy === "custom" && customOrder.length) {
      ordered = customOrder
        .map((id) => sims.find((d) => d.id === id.toString()))
        .filter(Boolean);
    }

    // 4b) for each debt, create a transaction
    for (let i = 0; i < ordered.length; i++) {
      const d = ordered[i];
      if (d.balance <= 0) continue;

      const opening = d.balance;
      const interest = +((opening * (d.apr / 100)) / 12).toFixed(2);
      totalInterest += interest;

      let payment = d.minPayment;
      // throw extra pool at first debt in non-custom strategies
      if (strategy === "custom") {
        // find any extra for this debt
        const ep = extraPayments.find((x) => x.debt.toString() === d.id);
        if (ep) payment += ep.extraAmount;
      } else if (i === 0 && extraPool > 0) {
        payment += extraPool;
      }
      // cap final payment
      if (opening + interest <= payment) {
        payment = +(opening + interest).toFixed(2);
      }

      const principal = +(payment - interest).toFixed(2);
      const closing = +(opening - principal).toFixed(2);

      if (!preview) {
        // persist this transaction
        const txn = await DebtTransaction.create({
          user: userId,
          debt: d.id,
          openingBalance: opening,
          paymentAmount: payment,
          principalComponent: principal,
          interestComponent: interest,
          closingBalance: closing,
          dueDate: d.dueDate,
          status: "upcoming",
        });
      }

      lastDueDate = new Date(d.dueDate);

      // update in-memory for next loop
      d.balance = closing;
      d.dueDate = addMonths(d.dueDate, 1);
    }
  }

  // 5) simulate no-extra scenario to get interestNoExtra
  let interestNoExtra = 0;
  sims.forEach(
    (_, i) =>
      (sims[i] = {
        ...debts[i].toObject(),
        balance: debts[i].principal,
        minPayment: debts[i].minPaymentAmount,
        dueDate: new Date(debts[i].nextDueDate),
      })
  );
  iter = 0;
  while (sims.some((d) => d.balance > 0) && iter++ < maxIter) {
    let ordered = sims;
    if (strategy === "avalanche" || strategy === "ai") {
      ordered = sims.slice().sort((a, b) => b.apr - a.apr);
    } else if (strategy === "snowball") {
      ordered = sims.slice().sort((a, b) => a.balance - b.balance);
    } else if (strategy === "custom" && customOrder.length) {
      ordered = customOrder
        .map((id) => sims.find((d) => d._id.toString() === id.toString()))
        .filter(Boolean);
    }
    for (const d of ordered) {
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

module.exports = generateFullPlan;
