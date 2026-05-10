// budgeting.js
// NHS 50/30/20 budgeting calculator logic.

const budgetContainer = document.getElementById('budgeting-container');

/**
 * Format a number as a currency string.
 * @param {number} value
 * @returns {string}
 */
const formatCurrency = (value) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 2,
  }).format(value);

/**
 * Calculate the 50/30/20 split and render it to the DOM.
 * @param {number} monthlyIncome
 * @param {HTMLElement} resultsContainer
 */
const renderBudgetBreakdown = (monthlyIncome, resultsContainer) => {
  const needs = monthlyIncome * 0.5;
  const wants = monthlyIncome * 0.3;
  const savings = monthlyIncome * 0.2;

  resultsContainer.innerHTML = `
    <div class="budget-card">
      <p class="budget-summary">Based on the 50/30/20 rule:</p>
      <ul class="budget-breakdown">
        <li><strong>Needs (50%)</strong>: ${formatCurrency(needs)}<br>Essentials like rent/mortgage, utilities, groceries, and transport.</li>
        <li><strong>Wants (30%)</strong>: ${formatCurrency(wants)}<br>Flexible spending like dining out, hobbies, and subscriptions.</li>
        <li><strong>Savings & Debt (20%)</strong>: ${formatCurrency(savings)}<br>Emergency funds, investments, or paying down credit.</li>
      </ul>
    </div>
  `;
};

/**
 * Build the budgeting input form inside the budgeting tab.
 */
const setupBudgetCalculator = () => {
  if (!budgetContainer) return;

  budgetContainer.innerHTML = `
    <label for="monthly-income">Monthly take-home pay (after tax):</label>
    <input id="monthly-income" type="number" min="0" step="0.01" placeholder="Enter your monthly income" />
    <button id="calculate-budget">Calculate</button>
    <div id="budget-results" class="budget-results"></div>
  `;

  const incomeInput = document.getElementById('monthly-income');
  const calculateButton = document.getElementById('calculate-budget');
  const resultsContainer = document.getElementById('budget-results');

  const showResults = () => {
    const income = parseFloat(incomeInput.value);
    if (!income || income <= 0) {
      resultsContainer.innerHTML = '<p class="budget-error">Please enter a valid monthly take-home pay above zero.</p>';
      return;
    }

    renderBudgetBreakdown(income, resultsContainer);
  };

  calculateButton.addEventListener('click', showResults);

  incomeInput.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      showResults();
    }
  });
};

/**
 * Initialize the budgeting calculator when the DOM is ready.
 */
document.addEventListener('DOMContentLoaded', setupBudgetCalculator);
