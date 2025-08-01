const DebtTransaction = require("../models/debtTransaction.model"); // your DebtTransaction model

/**
 * Adds n months to a date, preserving as best-effort the day.
 */
function addMonths(date, n) {
  const d = new Date(date);
  const day = d.getDate();
  d.setMonth(d.getMonth() + n);

  // If adding months overshoots (e.g. Jan 31 → Mar 3), clamp to last day of prev month
  if (d.getDate() !== day) {
    d.setDate(0); // roll back to last day of previous month
  }
  return d;
}

/**
 * Given a Debt doc with fields:
 *   - user, _id, balance, minPaymentAmount, apr, nextDueDate
 * generates and persists its repayment schedule as DebtTransaction docs.
 * @param {Object} debt  Mongoose doc
 * @returns {Promise<Array>}  inserted DebtTransaction docs
 */
async function generateTransactionsForDebt(debt) {
  const transactionsData = [];
  let balance = debt.balance;
  const monthlyRate = debt.apr / 100 / 12;
  let dueDate = new Date(debt.nextDueDate);

  // safety cap: max 600 payments
  while (balance > 0 && transactionsData.length < 1200) {
    const openingBalance = balance;
    const interest = parseFloat((openingBalance * monthlyRate).toFixed(2));

    // decide payment (final payment may be < minPayment)
    let paymentAmount = debt.minPaymentAmount;
    if (openingBalance + interest <= paymentAmount) {
      paymentAmount = parseFloat((openingBalance + interest).toFixed(2));
    }

    const principalComponent = parseFloat(
      (paymentAmount - interest).toFixed(2)
    );
    const closingBalance = parseFloat(
      (openingBalance - principalComponent).toFixed(2)
    );

    transactionsData.push({
      user: debt.user,
      debt: debt._id,
      paymentAmount,
      dueDate,
      status: "upcoming",
      principalComponent,
      interestComponent: interest,
      openingBalance,
      closingBalance,
    });

    balance = closingBalance;
    dueDate = addMonths(dueDate, 1);
  }

  // bulk insert and return created docs
  const createdTxns = await DebtTransaction.insertMany(transactionsData);
  return createdTxns;
}

module.exports = generateTransactionsForDebt;
