// services/planGenerator.js
const DebtTransaction = require("../models/debtTransaction.model");

/** Add n months to a JS Date, clamping to month-end if needed. */
function addMonths(date, n) {
  const d = new Date(date);
  const day = d.getDate();
  d.setMonth(d.getMonth() + n);
  if (d.getDate() !== day) d.setDate(0);
  return d;
}

/** -------- HYBRID ORDERING HELPERS -------- **/

// Return per-index normalized ranks in [0..1]; 1 = highest priority
function normalizedRanks(items, key, ascending = true) {
  const active = items
    .map((d, idx) => ({ idx, val: d[key] }))
    .filter((x) => items[x.idx].balance > 0);

  const scores = new Array(items.length).fill(0);

  if (active.length <= 1) {
    // with <=1 active debt, give full score to active debt(s)
    items.forEach((_, i) => (scores[i] = items[i].balance > 0 ? 1 : 0));
    return scores;
  }

  active.sort((a, b) => (ascending ? a.val - b.val : b.val - a.val));
  const lastRank = active.length - 1;
  active.forEach((a, pos) => {
    const norm = lastRank === 0 ? 1 : 1 - pos / lastRank; // best → 1, worst → 0
    scores[a.idx] = norm;
  });
  return scores;
}

// Compute weighted hybrid priority scores for current month
function hybridScores(sims) {
  const total = sims.length;
  const paidOff = sims.filter((d) => d.balance <= 0).length;
  const progress = total > 0 ? paidOff / total : 0;

  // Start Snowball-heavy (balance) and ramp to Avalanche (APR)
  // wAPR ramps 0.3 → 0.7; wBal = 1 - wAPR
  const wAPR = 0.3 + 0.4 * progress;
  const wBal = 1 - wAPR;

  const aprRank = normalizedRanks(sims, "apr", /*ascending*/ false); // higher APR better
  const balRank = normalizedRanks(sims, "balance", /*ascending*/ true); // smaller balance better

  return sims.map((_, i) => wAPR * aprRank[i] + wBal * balRank[i]);
}

function orderByHybrid(sims) {
  const scores = hybridScores(sims);
  return sims
    .map((d, i) => ({ d, s: scores[i] }))
    .sort((a, b) => b.s - a.s)
    .map((x) => x.d);
}

/**
 * Generates a payoff plan for Avalanche, Snowball, Custom, or Hybrid.
 *
 * @param {Object} opts
 * @param {String} opts.userId
 * @param {Array}  opts.debts           – array of debt docs/POJOs with {_id, balance, principal?, apr, minPaymentAmount, nextDueDate}
 * @param {Number} opts.income
 * @param {Number} opts.totalExpenses
 * @param {String} opts.strategy        – 'avalanche' | 'snowball' | 'custom' | 'hybrid'
 * @param {Array}  opts.customOrder     – array of debt ids (strings) for 'custom'
 * @param {Array}  opts.extraPayments   – [{ debt: <id>, extraAmount: number }] for 'custom'
 * @param {Boolean}opts.preview         – if true, don't persist transactions
 * @returns {Object} { estimatedDebtFreeDate, totalInterestPaid, totalSavings }
 */
async function generateFullPlan(opts) {
  const {
    userId,
    debts,
    income = 0,
    totalExpenses = 0,
    strategy,
    customOrder = [],
    extraPayments = [],
    preview = false,
  } = opts || {};

  if (!Array.isArray(debts) || debts.length === 0) {
    return {
      estimatedDebtFreeDate: null,
      totalInterestPaid: 0,
      totalSavings: 0,
    };
  }

  if (!preview) {
    await DebtTransaction.deleteMany({ user: userId, status: { $ne: "paid" } });
  }

  // Working copy for the main simulation
  const sims = debts.map((src) => {
    const d = src.toObject ? src.toObject() : src;
    return {
      id: (d._id || d.id).toString(),
      balance: Number.isFinite(d.balance) ? d.balance : Number(d.balance) || 0,
      minPayment: Number.isFinite(d.minPaymentAmount)
        ? d.minPaymentAmount
        : Number(d.minPaymentAmount) || 0,
      apr: Number.isFinite(d.apr) ? d.apr : Number(d.apr) || 0,
      dueDate: new Date(d.nextDueDate),
    };
  });

  let totalInterest = 0;
  let lastDebtFreeDate = null; // track max dueDate when any debt hits zero
  let iter = 0,
    maxIter = 1200; // cap to avoid infinite loops

  // -------- Monthly loop WITH extra pool --------
  while (sims.some((d) => d.balance > 0) && iter++ < maxIter) {
    // Compute this month's extra pool using ONLY active debts' minimums (so snowball grows)
    const active = sims.filter((d) => d.balance > 0);
    const sumMinThisMonth = active.reduce((s, d) => s + d.minPayment, 0);
    let extraPool = Math.max(0, income - totalExpenses - sumMinThisMonth);

    // Determine ordering for this month
    let ordered = sims;
    if (strategy === "avalanche") {
      ordered = sims.slice().sort((a, b) => b.apr - a.apr);
    } else if (strategy === "snowball") {
      ordered = sims.slice().sort((a, b) => a.balance - b.balance);
    } else if (strategy === "hybrid") {
      ordered = orderByHybrid(sims);
    } else if (strategy === "custom" && customOrder.length) {
      ordered = customOrder
        .map((id) => sims.find((d) => d.id === id.toString()))
        .filter(Boolean);
    } else {
      // default to avalanche if strategy is unknown
      ordered = sims.slice().sort((a, b) => b.apr - a.apr);
    }

    // Pay debts in priority order; carry leftover extra within the same month
    for (let i = 0; i < ordered.length; i++) {
      const d = ordered[i];
      if (d.balance <= 0) continue;

      const opening = d.balance;
      const interest = +((opening * (d.apr / 100)) / 12).toFixed(2);
      totalInterest += interest;

      // Determine how much extra we can throw at this debt this month
      const neededToClose = Math.max(0, opening + interest - d.minPayment);
      let add = 0;

      if (strategy === "custom") {
        const ep = extraPayments.find((x) => x.debt.toString() === d.id);
        add = Math.max(0, Math.min(neededToClose, ep ? ep.extraAmount : 0));
      } else {
        add = Math.max(0, Math.min(neededToClose, extraPool));
      }

      let payment = d.minPayment + add;
      if (payment > opening + interest)
        payment = +(opening + interest).toFixed(2);

      const principal = +(payment - interest).toFixed(2);
      const closing = +(opening - principal).toFixed(2);

      // Decrease leftover pool for the month
      extraPool -= add;

      if (!preview) {
        await DebtTransaction.create({
          user: userId,
          debt: d.id,
          openingBalance: +opening.toFixed(2),
          paymentAmount: +payment.toFixed(2),
          principalComponent: +principal.toFixed(2),
          interestComponent: +interest.toFixed(2),
          closingBalance: +closing.toFixed(2),
          dueDate: d.dueDate,
          status: "upcoming",
        });
      }

      // If this payment closes the debt, record the (max) month it closed
      if (closing <= 0.000001) {
        lastDebtFreeDate = lastDebtFreeDate
          ? new Date(Math.max(lastDebtFreeDate, d.dueDate))
          : new Date(d.dueDate);
      }

      // Update for next cycle
      d.balance = closing;
      d.dueDate = addMonths(d.dueDate, 1);
    }
  }

  // -------- Baseline: MIN PAYMENTS ONLY (no extra) --------
  let interestNoExtra = 0;

  // Reset sims to original state, using the same starting BALANCE & dates
  sims.forEach((_, i) => {
    const src = debts[i].toObject ? debts[i].toObject() : debts[i];
    sims[i] = {
      id: (src._id || src.id).toString(),
      balance: Number.isFinite(src.balance)
        ? src.balance
        : Number(src.balance) || 0,
      minPayment: Number.isFinite(src.minPaymentAmount)
        ? src.minPaymentAmount
        : Number(src.minPaymentAmount) || 0,
      apr: Number.isFinite(src.apr) ? src.apr : Number(src.apr) || 0,
      dueDate: new Date(src.nextDueDate),
    };
  });

  iter = 0;
  while (sims.some((d) => d.balance > 0) && iter++ < maxIter) {
    let ordered = sims;
    if (strategy === "avalanche") {
      ordered = sims.slice().sort((a, b) => b.apr - a.apr);
    } else if (strategy === "snowball") {
      ordered = sims.slice().sort((a, b) => a.balance - b.balance);
    } else if (strategy === "hybrid") {
      ordered = orderByHybrid(sims); // ordering doesn't change math here (min-only), but keep consistent
    } else if (strategy === "custom" && customOrder.length) {
      ordered = customOrder
        .map((id) =>
          sims.find((d) => (d._id || d.id).toString() === id.toString())
        )
        .filter(Boolean);
    } else {
      ordered = sims.slice().sort((a, b) => b.apr - a.apr);
    }

    for (const d of ordered) {
      if (d.balance <= 0) continue;
      const opening = d.balance;
      const interest = +((opening * (d.apr / 100)) / 12).toFixed(2);
      interestNoExtra += interest;

      let payment = d.minPayment;
      if (payment > opening + interest)
        payment = +(opening + interest).toFixed(2);

      const principal = +(payment - interest).toFixed(2);
      d.balance = +(opening - principal).toFixed(2);
      d.dueDate = addMonths(d.dueDate, 1);
    }
  }

  return {
    estimatedDebtFreeDate: lastDebtFreeDate,
    totalInterestPaid: +totalInterest.toFixed(2),
    totalSavings: +(interestNoExtra - totalInterest).toFixed(2),
  };
}

module.exports = generateFullPlan;
