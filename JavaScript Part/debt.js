// debt.js
// NHS Debt Payoff Calculator logic.

const debtContainer = document.getElementById('debt-container');

const formatDebtCurrency = function(value) {
  return '$' + value.toFixed(2);
};

const calculateDebtPayoff = function(totalDebt, apr, monthlyPayment) {
  const monthlyRate = apr / 100 / 12;
  let debtBalance = totalDebt;
  let debtMonths = 0;
  let totalInterestPaid = 0;
  let totalPrincipalPaid = 0;

  if (monthlyPayment <= 0) {
    return null;
  }

  if (monthlyRate > 0 && monthlyPayment <= totalDebt * monthlyRate) {
    return null;
  }

  while (debtBalance > 0 && debtMonths < 600) {
    debtMonths += 1;
    const monthlyInterest = debtBalance * monthlyRate;
    totalInterestPaid += monthlyInterest;

    const payment = Math.min(debtBalance + monthlyInterest, monthlyPayment);
    const principalPaid = payment - monthlyInterest;
    totalPrincipalPaid += principalPaid;

    debtBalance = debtBalance + monthlyInterest - payment;
  }

  return {
    months: debtMonths,
    interestPaid: totalInterestPaid,
    principalPaid: totalPrincipalPaid,
    totalPaid: totalInterestPaid + totalPrincipalPaid,
  };
};

const getDebtFreeDate = function(months) {
  const date = new Date();
  date.setMonth(date.getMonth() + months);
  const monthName = date.toLocaleString('en-US', { month: 'long' });
  return monthName + ' ' + date.getFullYear();
};

const renderDebtResults = function(result, totalDebt, monthlyPayment, resultsContainer) {
  const completionDate = getDebtFreeDate(result.months);

  resultsContainer.innerHTML = '<div class="debt-card" style="margin-top:20px; padding:20px; background:#ffffff; border:1px solid #d3e6d8; border-radius:8px; color:#033d1a; box-shadow:0 2px 8px rgba(0,0,0,0.05);">' +
    '<p style="font-size:1.1rem; font-weight:700; margin:0 0 12px;">Debt Payoff Results</p>' +
    '<ul style="list-style:none; margin:0; padding:0; line-height:1.8;">' +
      '<li><strong>Total Debt:</strong> ' + formatDebtCurrency(totalDebt) + '</li>' +
      '<li><strong>Monthly Payment:</strong> ' + formatDebtCurrency(monthlyPayment) + '</li>' +
      '<li><strong>Months to Debt Free:</strong> ' + result.months + '</li>' +
      '<li><strong>Debt-Free Date:</strong> ' + completionDate + '</li>' +
      '<li><strong>Principal Paid:</strong> ' + formatDebtCurrency(result.principalPaid) + '</li>' +
      '<li><strong>Interest Paid:</strong> ' + formatDebtCurrency(result.interestPaid) + '</li>' +
      '<li><strong>Total Amount Paid:</strong> ' + formatDebtCurrency(result.totalPaid) + '</li>' +
    '</ul>' +
    '<div style="margin-top:14px; padding:12px; background:#eaf8ed; border-left:4px solid #004d2c; color:#05401f; border-radius:4px;">' +
      '<strong>NHS Support Tip:</strong> Explore NHS Hardship Fund support or Salary Sacrifice schemes to reduce taxable income and free up cash for debt repayment.</div>' +
  '</div>';
};

const setupDebtCalculator = function() {
  if (!debtContainer) return;

  debtContainer.innerHTML = '<div class="debt-form" style="display:flex; flex-direction:column; gap:12px; max-width:420px;">' +
    '<label for="total-debt">Total Debt Amount ($):</label>' +
    '<input id="total-debt" type="number" min="0" step="0.01" placeholder="e.g., 8000" style="padding:10px; border:1px solid #b3d7c5; border-radius:4px;" />' +
    '<label for="interest-rate">Interest Rate (APR %):</label>' +
    '<input id="interest-rate" type="number" min="0" step="0.01" placeholder="e.g., 14.9" style="padding:10px; border:1px solid #b3d7c5; border-radius:4px;" />' +
    '<label for="monthly-payment">Monthly Payment Amount ($):</label>' +
    '<input id="monthly-payment" type="number" min="0" step="0.01" placeholder="e.g., 250" style="padding:10px; border:1px solid #b3d7c5; border-radius:4px;" />' +
    '<button id="calculate-debt" style="padding:12px 16px; background:#004d2c; color:#ffffff; border:none; border-radius:6px; font-weight:700; cursor:pointer;">Calculate Debt Payoff</button>' +
  '</div>' +
  '<div id="debt-results" class="debt-results"></div>';

  const totalDebtInput = document.getElementById('total-debt');
  const interestInput = document.getElementById('interest-rate');
  const monthlyPaymentInput = document.getElementById('monthly-payment');
  const calculateButton = document.getElementById('calculate-debt');
  const resultsContainer = document.getElementById('debt-results');

  const showDebtResults = function() {
    const totalDebt = parseFloat(totalDebtInput.value);
    const apr = parseFloat(interestInput.value) || 0;
    const monthlyPayment = parseFloat(monthlyPaymentInput.value);

    if (!totalDebt || totalDebt <= 0 || !monthlyPayment || monthlyPayment <= 0) {
      resultsContainer.innerHTML = '<p style="color:#b71c1c; font-weight:700;">Please enter a valid debt amount and monthly payment above zero.</p>';
      return;
    }

    const result = calculateDebtPayoff(totalDebt, apr, monthlyPayment);
    if (!result) {
      resultsContainer.innerHTML = '<p style="color:#b71c1c; font-weight:700;">Monthly payment is too low to cover interest. Please increase your payment.</p>';
      return;
    }

    renderDebtResults(result, totalDebt, monthlyPayment, resultsContainer);
  };

  calculateButton.addEventListener('click', showDebtResults);

  [totalDebtInput, interestInput, monthlyPaymentInput].forEach(function(input) {
    input.addEventListener('keydown', function(event) {
      if (event.key === 'Enter') {
        event.preventDefault();
        showDebtResults();
      }
    });
  });
};

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', setupDebtCalculator);
} else {
  setupDebtCalculator();
}
