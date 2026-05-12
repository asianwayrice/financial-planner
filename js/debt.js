// debt.js
// NHS Debt Snowball / Avalanche Payoff Calculator

(function () {
'use strict';

// ─── Formatting ───────────────────────────────────────────────────────────────

const formatCurrency = function (value) {
  return '$' + value.toFixed(2);
};

const getDebtFreeDate = function (months) {
  const date = new Date();
  date.setMonth(date.getMonth() + months);
  return date.toLocaleString('en-US', { month: 'long' }) + ' ' + date.getFullYear();
};

// ─── Core Simulation ──────────────────────────────────────────────────────────

const simulatePayoff = function (debts, extraPayment, strategy) {
  for (const d of debts) {
    const rate = d.apr / 100 / 12;
    if (rate > 0 && d.minPayment <= d.balance * rate) return null;
    if (d.minPayment <= 0) return null;
  }

  let state = debts.map(function (d) {
    return {
      name: d.name,
      balance: d.balance,
      apr: d.apr,
      minPayment: d.minPayment,
      rate: d.apr / 100 / 12,
      paid: false,
      interestPaid: 0,
      totalPaid: 0,
    };
  });

  const orderedNames = state
    .slice()
    .sort(function (a, b) {
      if (strategy === 'snowball') return a.balance - b.balance;
      return b.apr - a.apr;
    })
    .map(function (d) { return d.name; });

  let months = 0;
  let totalInterest = 0;
  const MAX_MONTHS = 600;

  while (state.some(function (d) { return !d.paid; }) && months < MAX_MONTHS) {
    months += 1;

    state.forEach(function (d) {
      if (!d.paid) {
        const interest = d.balance * d.rate;
        d.balance += interest;
        d.interestPaid += interest;
        totalInterest += interest;
      }
    });

    let remainingExtra = extraPayment;
    state.forEach(function (d) {
      if (!d.paid) {
        const payment = Math.min(d.balance, d.minPayment);
        d.balance -= payment;
        d.totalPaid += payment;
        if (d.balance < 0.005) {
          remainingExtra += -d.balance;
          d.balance = 0;
          d.paid = true;
        }
      }
    });

    if (remainingExtra > 0) {
      const target = orderedNames
        .map(function (name) { return state.find(function (d) { return d.name === name; }); })
        .find(function (d) { return !d.paid; });

      if (target) {
        const payment = Math.min(target.balance, remainingExtra);
        target.balance -= payment;
        target.totalPaid += payment;
        if (target.balance < 0.005) {
          target.balance = 0;
          target.paid = true;
        }
      }
    }
  }

  return {
    months: months,
    totalInterest: totalInterest,
    totalPaid: state.reduce(function (s, d) { return s + d.totalPaid; }, 0),
    perDebt: state.map(function (d) {
      return { name: d.name, interestPaid: d.interestPaid, totalPaid: d.totalPaid };
    }),
    orderedNames: orderedNames,
  };
};

// ─── Render debt input row ────────────────────────────────────────────────────

const renderDebtRow = function (index) {
  return (
    '<div class="debt-row" data-index="' + index + '">' +
      '<div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">' +
        '<strong class="debt-row-label">Debt #' + (index + 1) + '</strong>' +
        (index > 0
          ? '<button class="remove-debt btn-remove" data-index="' + index + '">✕ Remove</button>'
          : '') +
      '</div>' +
      '<div style="display:grid; grid-template-columns:1fr 1fr; gap:10px;">' +
        '<div style="grid-column:1/-1;">' +
          '<label class="debt-label">Debt Name</label>' +
          '<input class="debt-name debt-input" type="text" placeholder="e.g., Credit Card A" />' +
        '</div>' +
        '<div>' +
          '<label class="debt-label">Balance ($)</label>' +
          '<input class="debt-balance debt-input" type="number" min="0" step="0.01" placeholder="e.g., 3500" />' +
        '</div>' +
        '<div>' +
          '<label class="debt-label">APR (%)</label>' +
          '<input class="debt-apr debt-input" type="number" min="0" step="0.01" placeholder="e.g., 19.9" />' +
        '</div>' +
        '<div style="grid-column:1/-1;">' +
          '<label class="debt-label">Minimum Monthly Payment ($)</label>' +
          '<input class="debt-min debt-input" type="number" min="0" step="0.01" placeholder="e.g., 75" />' +
        '</div>' +
      '</div>' +
    '</div>'
  );
};

// ─── Render single-strategy results ──────────────────────────────────────────

const renderResults = function (result, strategy, extraPayment, container) {
  const strategyLabel = strategy === 'snowball' ? '❄️ Debt Snowball' : '🔥 Debt Avalanche';
  const strategyNote  = strategy === 'snowball'
    ? 'Pays smallest balances first — builds psychological momentum.'
    : 'Pays highest-interest debts first — minimises total interest paid.';

  const orderList = result.orderedNames
    .map(function (name, i) {
      return '<li style="margin-bottom:4px;"><strong>' + (i + 1) + '.</strong> ' + name + '</li>';
    }).join('');

  const perDebtRows = result.perDebt
    .map(function (d) {
      return (
        '<tr>' +
          '<td class="debt-result-cell">' + d.name + '</td>' +
          '<td class="debt-result-cell" style="text-align:right;">' + formatCurrency(d.totalPaid - d.interestPaid) + '</td>' +
          '<td class="debt-result-cell debt-interest-cell" style="text-align:right;">' + formatCurrency(d.interestPaid) + '</td>' +
          '<td class="debt-result-cell" style="text-align:right; font-weight:700;">' + formatCurrency(d.totalPaid) + '</td>' +
        '</tr>'
      );
    }).join('');

  container.innerHTML =
    '<div class="debt-results-card">' +
      '<p class="debt-results-title">' + strategyLabel + ' Results</p>' +
      '<p class="debt-results-note">' + strategyNote + '</p>' +

      '<div style="display:grid; grid-template-columns:repeat(auto-fit,minmax(140px,1fr)); gap:12px; margin-bottom:20px;">' +
        '<div class="debt-stat-box">' +
          '<div class="debt-stat-value" style="font-size:1.6rem;">' + result.months + '</div>' +
          '<div class="debt-stat-label">Months to Debt-Free</div>' +
        '</div>' +
        '<div class="debt-stat-box">' +
          '<div class="debt-stat-value">' + getDebtFreeDate(result.months) + '</div>' +
          '<div class="debt-stat-label">Debt-Free Date</div>' +
        '</div>' +
        '<div class="debt-stat-box debt-stat-interest">' +
          '<div class="debt-stat-value debt-stat-value-red">' + formatCurrency(result.totalInterest) + '</div>' +
          '<div class="debt-stat-label">Total Interest Paid</div>' +
        '</div>' +
        '<div class="debt-stat-box">' +
          '<div class="debt-stat-value">' + formatCurrency(result.totalPaid) + '</div>' +
          '<div class="debt-stat-label">Total Amount Paid</div>' +
        '</div>' +
      '</div>' +

      '<p style="font-weight:700; margin:0 0 8px;">Payoff Order</p>' +
      '<ol style="margin:0 0 18px; padding-left:20px; line-height:1.9;">' + orderList + '</ol>' +

      '<p style="font-weight:700; margin:0 0 8px;">Per-Debt Breakdown</p>' +
      '<div style="overflow-x:auto;">' +
        '<table class="debt-table">' +
          '<thead><tr class="debt-table-head">' +
            '<th class="debt-th" style="text-align:left;">Debt</th>' +
            '<th class="debt-th" style="text-align:right;">Principal</th>' +
            '<th class="debt-th" style="text-align:right;">Interest</th>' +
            '<th class="debt-th" style="text-align:right;">Total</th>' +
          '</tr></thead>' +
          '<tbody>' + perDebtRows + '</tbody>' +
        '</table>' +
      '</div>' +

      '<div class="debt-tip-box">' +
        '<strong>NHS Support Tip:</strong> Explore NHS Hardship Fund support or Salary Sacrifice schemes to reduce taxable income and free up cash for debt repayment.' +
      '</div>' +
    '</div>';
};

// ─── Setup ────────────────────────────────────────────────────────────────────

const setupDebtCalculator = function () {
  const debtContainer = document.getElementById('debt-container');
  if (!debtContainer) return;

  debtContainer.innerHTML =
    '<div style="max-width:600px;">' +
      '<div id="debt-rows" style="display:flex; flex-direction:column; gap:12px;">' +
        renderDebtRow(0) +
      '</div>' +

      '<button id="add-debt" class="btn-add-debt">+ Add Another Debt</button>' +

      '<div class="debt-section-box" style="margin-top:20px;">' +
        '<label class="debt-label">Extra Monthly Payment ($) <span class="debt-muted">(beyond minimums)</span></label>' +
        '<input id="extra-payment" class="debt-input" type="number" min="0" step="0.01" placeholder="e.g., 150" style="max-width:240px;" />' +
      '</div>' +

      '<div style="margin-top:16px;">' +
        '<label class="debt-label" style="margin-bottom:8px; display:block;">Payoff Strategy</label>' +
        '<div style="display:flex; gap:10px; flex-wrap:wrap;">' +
          '<label class="strategy-label strategy-selected">' +
            '<input type="radio" name="strategy" value="avalanche" checked style="margin-top:3px;" />' +
            '<span><strong>🔥 Avalanche</strong><br><span class="debt-muted" style="font-size:0.82rem;">Highest APR first — saves the most interest</span></span>' +
          '</label>' +
          '<label class="strategy-label">' +
            '<input type="radio" name="strategy" value="snowball" style="margin-top:3px;" />' +
            '<span><strong>❄️ Snowball</strong><br><span class="debt-muted" style="font-size:0.82rem;">Smallest balance first — builds momentum</span></span>' +
          '</label>' +
        '</div>' +
      '</div>' +

      '<div style="margin-top:20px; display:flex; gap:10px; flex-wrap:wrap;">' +
        '<button id="calculate-btn" class="btn-calculate">Calculate Payoff Plan</button>' +
        '<button id="compare-btn" class="btn-compare">Compare Both Strategies</button>' +
      '</div>' +

      '<div id="debt-results"></div>' +
    '</div>';

  const debtRowsContainer = document.getElementById('debt-rows');
  const resultsContainer  = document.getElementById('debt-results');

  document.getElementById('add-debt').addEventListener('click', function () {
    const count = debtRowsContainer.querySelectorAll('.debt-row').length;
    const div = document.createElement('div');
    div.innerHTML = renderDebtRow(count);
    debtRowsContainer.appendChild(div.firstChild);
  });

  debtRowsContainer.addEventListener('click', function (e) {
    if (e.target.classList.contains('remove-debt')) {
      const index = parseInt(e.target.dataset.index, 10);
      const rows = debtRowsContainer.querySelectorAll('.debt-row');
      if (rows[index]) rows[index].remove();
      debtRowsContainer.querySelectorAll('.debt-row').forEach(function (row, i) {
        row.querySelector('.debt-row-label').textContent = 'Debt #' + (i + 1);
        const removeBtn = row.querySelector('.remove-debt');
        if (removeBtn) removeBtn.dataset.index = i;
      });
    }
  });

  document.querySelectorAll('input[name="strategy"]').forEach(function (radio) {
    radio.addEventListener('change', function () {
      document.querySelectorAll('input[name="strategy"]').forEach(function (r) {
        r.closest('label').classList.toggle('strategy-selected', r.checked);
      });
    });
  });

  const readDebts = function () {
    const rows = debtRowsContainer.querySelectorAll('.debt-row');
    const debts = [];
    let valid = true;
    rows.forEach(function (row, i) {
      const name    = (row.querySelector('.debt-name').value.trim()) || ('Debt #' + (i + 1));
      const balance = parseFloat(row.querySelector('.debt-balance').value);
      const apr     = parseFloat(row.querySelector('.debt-apr').value) || 0;
      const min     = parseFloat(row.querySelector('.debt-min').value);
      if (!balance || balance <= 0 || !min || min <= 0) { valid = false; return; }
      debts.push({ name, balance, apr, minPayment: min });
    });
    return valid && debts.length > 0 ? debts : null;
  };

  document.getElementById('calculate-btn').addEventListener('click', function () {
    const debts = readDebts();
    if (!debts) {
      resultsContainer.innerHTML = '<p class="debt-error">Please fill in all debt fields with values greater than zero.</p>';
      return;
    }
    const extra    = parseFloat(document.getElementById('extra-payment').value) || 0;
    const strategy = document.querySelector('input[name="strategy"]:checked').value;
    const result   = simulatePayoff(debts, extra, strategy);
    if (!result) {
      resultsContainer.innerHTML = '<p class="debt-error">One or more minimum payments are too low to cover monthly interest. Please increase the minimum payments.</p>';
      return;
    }
    renderResults(result, strategy, extra, resultsContainer);
  });

  document.getElementById('compare-btn').addEventListener('click', function () {
    const debts = readDebts();
    if (!debts) {
      resultsContainer.innerHTML = '<p class="debt-error">Please fill in all debt fields with values greater than zero.</p>';
      return;
    }
    const extra     = parseFloat(document.getElementById('extra-payment').value) || 0;
    const snowball  = simulatePayoff(debts, extra, 'snowball');
    const avalanche = simulatePayoff(debts, extra, 'avalanche');
    if (!snowball || !avalanche) {
      resultsContainer.innerHTML = '<p class="debt-error">One or more minimum payments are too low to cover monthly interest.</p>';
      return;
    }

    const interestSaved = snowball.totalInterest - avalanche.totalInterest;
    const monthsSaved   = snowball.months - avalanche.months;

    resultsContainer.innerHTML =
      '<div class="debt-results-card">' +
        '<p class="debt-results-title">Strategy Comparison</p>' +
        '<p class="debt-results-note">Same debts and extra payment, different order.</p>' +

        '<div style="display:grid; grid-template-columns:1fr 1fr; gap:16px; margin-bottom:20px;">' +
          '<div class="compare-box">' +
            '<p style="font-weight:700; margin:0 0 10px;">❄️ Snowball</p>' +
            '<p class="compare-row"><strong>Months:</strong> ' + snowball.months + '</p>' +
            '<p class="compare-row"><strong>Debt-Free:</strong> ' + getDebtFreeDate(snowball.months) + '</p>' +
            '<p class="compare-row debt-interest-cell"><strong>Interest:</strong> ' + formatCurrency(snowball.totalInterest) + '</p>' +
            '<p class="compare-row"><strong>Order:</strong> ' + snowball.orderedNames.join(' → ') + '</p>' +
          '</div>' +
          '<div class="compare-box compare-box-selected">' +
            '<p style="font-weight:700; margin:0 0 10px;">🔥 Avalanche</p>' +
            '<p class="compare-row"><strong>Months:</strong> ' + avalanche.months + '</p>' +
            '<p class="compare-row"><strong>Debt-Free:</strong> ' + getDebtFreeDate(avalanche.months) + '</p>' +
            '<p class="compare-row debt-interest-cell"><strong>Interest:</strong> ' + formatCurrency(avalanche.totalInterest) + '</p>' +
            '<p class="compare-row"><strong>Order:</strong> ' + avalanche.orderedNames.join(' → ') + '</p>' +
          '</div>' +
        '</div>' +

        (interestSaved > 0
          ? '<div class="debt-tip-box">💡 <strong>Avalanche saves you ' + formatCurrency(interestSaved) + ' in interest</strong>' +
            (monthsSaved !== 0 ? ' and ' + Math.abs(monthsSaved) + ' month(s) ' + (monthsSaved > 0 ? 'faster' : 'slower') : '') +
            ' compared to Snowball.</div>'
          : '<div class="debt-tip-box">💡 Both strategies perform similarly for your debt profile.</div>') +

        '<div class="debt-tip-box" style="margin-top:10px;">' +
          '<strong>NHS Support Tip:</strong> Explore NHS Hardship Fund support or Salary Sacrifice schemes to reduce taxable income and free up cash for debt repayment.' +
        '</div>' +
      '</div>';
  });
};

// ─── Init ─────────────────────────────────────────────────────────────────────

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', setupDebtCalculator);
} else {
  setupDebtCalculator();
}

})();