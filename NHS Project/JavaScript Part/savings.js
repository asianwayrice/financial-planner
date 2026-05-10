// savings.js
// NHS Savings Goal Calculator logic.

const formatSavingsCurrency = function(value) {
  // Use US Dollars for the savings calculator.
  return '$' + value.toFixed(2);
};

const calculateMonths = function(target, current, monthly, annualRate) {
  const remaining = target - current;
  if (remaining <= 0) return 0;

  if (annualRate > 0) {
    // Monthly compound interest calculation
    const monthlyRate = annualRate / 100 / 12;
    let balance = current;
    let months = 0;
    while (balance < target && months < 1200) { // Cap at 100 years
      balance = balance * (1 + monthlyRate) + monthly;
      months++;
    }
    return months;
  } else {
    return Math.ceil(remaining / monthly);
  }
};

const getCompletionDate = function(months) {
  const date = new Date();
  date.setMonth(date.getMonth() + months);
  // Formatted to MM/YYYY
  return (date.getMonth() + 1).toString().padStart(2, '0') + '/' + date.getFullYear();
};

const renderSavingsResults = function(target, current, monthly, months, resultsContainer) {
  const progress = Math.min((current / target) * 100, 100);
  const completionDate = getCompletionDate(months);

  // Added some inline styling to match the POLAHS green theme
  resultsContainer.innerHTML = `
    <div class="savings-card" style="margin-top: 20px; padding: 15px; border-left: 4px solid #004d2c; background-color: #f9f9f9; border-radius: 4px;">
        <p class="savings-summary" style="font-weight: bold; color: #004d2c; font-size: 1.1rem; margin-top: 0;">Savings Goal Results:</p>
        <ul class="savings-breakdown" style="list-style: none; padding-left: 0; line-height: 1.6;">
            <li><strong>Progress:</strong> ${progress.toFixed(1)}% (${formatCurrency(current)} / ${formatCurrency(target)})</li>
            <li><strong>Time to Goal:</strong> ${months} months</li>
            <li><strong>Estimated Completion:</strong> ${completionDate}</li>
        </ul>
        <p class="savings-tip" style="font-size: 0.9em; color: #555; border-top: 1px solid #ccc; padding-top: 10px;">
            <em><strong>Pro-Tip:</strong> As an NHS worker, consider maximizing your NHS Pension contributions or using Blue Light Card discounts to accelerate your savings!</em>
        </p>
    </div>
  `;
};

const setupSavingsCalculator = function() {
  // FIX: This is now inside the function, so it waits for the HTML to load!
  const savingsContainer = document.getElementById('savings-container');
  if (!savingsContainer) return;

  // Builds the layout cleanly
  savingsContainer.innerHTML = `
    <div class="calculator-inputs" style="display: flex; flex-direction: column; gap: 10px; max-width: 400px;">
        <label for="target-amount">Target Amount ($):</label>
        <input id="target-amount" type="number" min="0" step="0.01" placeholder="e.g., 5000" />

        <label for="monthly-contribution">Monthly Contribution ($):</label>
        <input id="monthly-contribution" type="number" min="0" step="0.01" placeholder="e.g., 200" />

        <label for="current-savings">Current Savings ($):</label>
        <input id="current-savings" type="number" min="0" step="0.01" placeholder="e.g., 1000" />

        <label for="interest-rate">Annual Interest Rate (% - optional):</label>
        <input id="interest-rate" type="number" min="0" step="0.01" placeholder="e.g., 3.5" />

        <button id="calculate-savings" style="padding: 10px; background-color: #004d2c; color: white; border: none; cursor: pointer; border-radius: 4px; font-weight: bold;">Calculate My Goal</button>
    </div>
    <div id="savings-results" class="savings-results"></div>
  `;

  const targetInput = document.getElementById('target-amount');
  const monthlyInput = document.getElementById('monthly-contribution');
  const currentInput = document.getElementById('current-savings');
  const rateInput = document.getElementById('interest-rate');
  const calculateButton = document.getElementById('calculate-savings');
  const resultsContainer = document.getElementById('savings-results');

  const showResults = function() {
    const target = parseFloat(targetInput.value);
    const monthly = parseFloat(monthlyInput.value);
    const current = parseFloat(currentInput.value) || 0;
    const rate = parseFloat(rateInput.value) || 0;

    if (!target || target <= 0 || !monthly || monthly <= 0) {
      resultsContainer.innerHTML = '<p class="savings-error" style="color: red; margin-top: 15px;">Please enter a valid target amount and monthly contribution above zero.</p>';
      return;
    }

    const months = calculateMonths(target, current, monthly, rate);
    renderSavingsResults(target, current, monthly, months, resultsContainer);
  };

  calculateButton.addEventListener('click', showResults);

  // Allows the user to press 'Enter' to calculate
  [targetInput, monthlyInput, currentInput, rateInput].forEach(function(input) {
    input.addEventListener('keydown', function(event) {
      if (event.key === 'Enter') {
        event.preventDefault();
        showResults();
      }
    });
  });
};

// Initialize the savings calculator when the DOM is ready.
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', setupSavingsCalculator);
} else {
  setupSavingsCalculator();
}