// career.js
// NHS Career Tools: take-home pay, raise simulator, and 401(k) match calculator.

const careerContainer = document.getElementById('career-container');

const formatCareerCurrency = function(value) {
  return '$' + value.toFixed(2);
};

const clamp = function(value, min, max) {
  return Math.min(Math.max(value, min), max);
};

const getFederalTax = function(income, filingStatus) {
  const brackets = filingStatus === 'married' ? [
    { rate: 0.10, limit: 20550 },
    { rate: 0.12, limit: 83550 },
    { rate: 0.22, limit: 178150 },
    { rate: 0.24, limit: 340100 },
    { rate: 0.32, limit: 431900 },
    { rate: 0.35, limit: 647850 },
    { rate: 0.37, limit: Infinity },
  ] : [
    { rate: 0.10, limit: 11000 },
    { rate: 0.12, limit: 44725 },
    { rate: 0.22, limit: 95375 },
    { rate: 0.24, limit: 182100 },
    { rate: 0.32, limit: 231250 },
    { rate: 0.35, limit: 578125 },
    { rate: 0.37, limit: Infinity },
  ];

  let tax = 0;
  let remaining = income;
  let lowerLimit = 0;

  for (let i = 0; i < brackets.length; i += 1) {
    const bracket = brackets[i];
    const taxable = Math.max(0, Math.min(remaining, bracket.limit - lowerLimit));
    if (taxable <= 0) break;
    tax += taxable * bracket.rate;
    remaining -= taxable;
    lowerLimit = bracket.limit;
  }

  return tax;
};

const stateTaxRates = {
  'AL': 5.00,'AK': 0.00,'AZ': 2.50,'AR': 4.40,'CA': 9.30,'CO': 4.40,'CT': 6.50,'DE': 6.60,'FL': 0.00,'GA': 5.75,
  'HI': 6.40,'ID': 5.80,'IL': 4.95,'IN': 3.23,'IA': 5.60,'KS': 5.70,'KY': 5.00,'LA': 4.25,'ME': 7.15,'MD': 5.75,
  'MA': 5.00,'MI': 4.25,'MN': 6.80,'MS': 4.00,'MO': 4.40,'MT': 6.75,'NE': 5.01,'NV': 0.00,'NH': 0.00,'NJ': 5.53,
  'NM': 4.90,'NY': 6.33,'NC': 4.99,'ND': 2.90,'OH': 3.99,'OK': 4.75,'OR': 9.90,'PA': 3.07,'RI': 5.99,'SC': 4.00,
  'SD': 0.00,'TN': 0.00,'TX': 0.00,'UT': 4.85,'VT': 6.50,'VA': 5.75,'WA': 0.00,'WV': 4.00,'WI': 5.30,'WY': 0.00,
  'DC': 6.00
};

const getStateTaxRate = function(stateCode) {
  return stateTaxRates[stateCode] || 0;
};

const parseMatchString = function(matchText) {
  const matchPercent = parseFloat(matchText) || 0;
  const capMatch = /up to\s*(\d+(?:\.\d+)?)%/i.exec(matchText);
  const capPercent = capMatch ? parseFloat(capMatch[1]) : 0;
  return {
    matchPercent: clamp(matchPercent, 0, 100),
    capPercent: clamp(capPercent, 0, 100),
  };
};

const drawCareerPieChart = function(canvas, taxes, takeHome) {
  const ctx = canvas.getContext('2d');
  const total = taxes + takeHome;
  const taxAngle = (taxes / total) * Math.PI * 2;
  const centerX = canvas.width / 2;
  const centerY = canvas.height / 2;
  const radius = Math.min(centerX, centerY) - 10;

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = '#b8d7c2';
  ctx.beginPath();
  ctx.moveTo(centerX, centerY);
  ctx.arc(centerX, centerY, radius, 0, taxAngle);
  ctx.fill();

  ctx.fillStyle = '#004d2c';
  ctx.beginPath();
  ctx.moveTo(centerX, centerY);
  ctx.arc(centerX, centerY, radius, taxAngle, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#fff';
  ctx.font = '14px Arial';
  ctx.textAlign = 'center';
  ctx.fillText('Taxes', centerX, centerY - 6);
  ctx.fillText('Take-Home', centerX, centerY + 14);
};

const calculateNetPay = function(annualSalary, filingStatus, stateTaxRate, kContributionPct) {
  const pretax401k = annualSalary * (kContributionPct / 100);
  const taxableIncome = Math.max(0, annualSalary - pretax401k);
  const federal = getFederalTax(taxableIncome, filingStatus);
  const socialSecurity = annualSalary * 0.062;
  const medicare = annualSalary * 0.0145;
  const stateTax = taxableIncome * (stateTaxRate / 100);
  const totalTaxes = federal + socialSecurity + medicare + stateTax;
  const takeHomeAnnual = Math.max(0, annualSalary - pretax401k - totalTaxes);

  return {
    federal: federal,
    socialSecurity: socialSecurity,
    medicare: medicare,
    stateTax: stateTax,
    pretax401k: pretax401k,
    totalTaxes: totalTaxes,
    takeHomeAnnual: takeHomeAnnual,
    takeHomeMonthly: takeHomeAnnual / 12,
  };
};

const setupCareerTools = function() {
  if (!careerContainer) return;

  careerContainer.innerHTML = '<div style="display:grid; gap:24px;">' +
    '<section style="background:#ffffff; padding:20px; border-radius:10px; border:1px solid #d7e8df; box-shadow:0 2px 8px rgba(0,0,0,0.05);">' +
      '<h3 style="margin-top:0; color:#003d1f;">Take-Home Pay Calculator</h3>' +
      '<div style="display:grid; gap:10px; max-width:540px;">' +
        '<label>Annual Salary ($):<input id="career-annual-salary" type="number" min="0" step="0.01" style="width:100%; padding:10px; border:1px solid #b3d7c5; border-radius:6px;" /></label>' +
        '<label>Filing Status:<select id="career-filing-status" style="width:100%; padding:10px; border:1px solid #b3d7c5; border-radius:6px;"><option value="single">Single</option><option value="married">Married</option></select></label>' +
        '<label>State:<select id="career-state" style="width:100%; padding:10px; border:1px solid #b3d7c5; border-radius:6px;">' +
          '<option value="">Select state</option>' +
          '<option value="AL">Alabama</option><option value="AK">Alaska</option><option value="AZ">Arizona</option><option value="AR">Arkansas</option><option value="CA">California</option>' +
          '<option value="CO">Colorado</option><option value="CT">Connecticut</option><option value="DE">Delaware</option><option value="DC">Washington DC</option><option value="FL">Florida</option>' +
          '<option value="GA">Georgia</option><option value="HI">Hawaii</option><option value="ID">Idaho</option><option value="IL">Illinois</option><option value="IN">Indiana</option>' +
          '<option value="IA">Iowa</option><option value="KS">Kansas</option><option value="KY">Kentucky</option><option value="LA">Louisiana</option><option value="ME">Maine</option>' +
          '<option value="MD">Maryland</option><option value="MA">Massachusetts</option><option value="MI">Michigan</option><option value="MN">Minnesota</option><option value="MS">Mississippi</option>' +
          '<option value="MO">Missouri</option><option value="MT">Montana</option><option value="NE">Nebraska</option><option value="NV">Nevada</option><option value="NH">New Hampshire</option>' +
          '<option value="NJ">New Jersey</option><option value="NM">New Mexico</option><option value="NY">New York</option><option value="NC">North Carolina</option><option value="ND">North Dakota</option>' +
          '<option value="OH">Ohio</option><option value="OK">Oklahoma</option><option value="OR">Oregon</option><option value="PA">Pennsylvania</option><option value="RI">Rhode Island</option>' +
          '<option value="SC">South Carolina</option><option value="SD">South Dakota</option><option value="TN">Tennessee</option><option value="TX">Texas</option><option value="UT">Utah</option>' +
          '<option value="VT">Vermont</option><option value="VA">Virginia</option><option value="WA">Washington</option><option value="WV">West Virginia</option><option value="WI">Wisconsin</option>' +
          '<option value="WY">Wyoming</option>' +
        '</select></label>' +
        '<label>401(k) Contribution (%):<input id="career-401k" type="number" min="0" step="0.01" placeholder="e.g. 5" style="width:100%; padding:10px; border:1px solid #b3d7c5; border-radius:6px;" /></label>' +
        '<button id="career-calc-netpay" style="padding:12px; background:#004d2c; color:#fff; border:none; border-radius:6px; cursor:pointer; font-weight:700;">Calculate Take-Home Pay</button>' +
      '</div>' +
      '<div id="career-netpay-results" style="margin-top:18px;"></div>' +
    '</section>' +

    '<section style="background:#ffffff; padding:20px; border-radius:10px; border:1px solid #d7e8df; box-shadow:0 2px 8px rgba(0,0,0,0.05);">' +
      '<h3 style="margin-top:0; color:#003d1f;">Raise & Promotion Simulator</h3>' +
      '<div style="display:grid; gap:10px; max-width:540px;">' +
        '<label>Current Salary ($):<input id="career-current-salary" type="number" min="0" step="0.01" style="width:100%; padding:10px; border:1px solid #b3d7c5; border-radius:6px;" /></label>' +
        '<label>New Salary ($):<input id="career-new-salary" type="number" min="0" step="0.01" style="width:100%; padding:10px; border:1px solid #b3d7c5; border-radius:6px;" /></label>' +
        '<button id="career-calc-raise" style="padding:12px; background:#004d2c; color:#fff; border:none; border-radius:6px; cursor:pointer; font-weight:700;">Show Effective Monthly Increase</button>' +
      '</div>' +
      '<div id="career-raise-results" style="margin-top:18px;"></div>' +
    '</section>' +

    '<section style="background:#ffffff; padding:20px; border-radius:10px; border:1px solid #d7e8df; box-shadow:0 2px 8px rgba(0,0,0,0.05);">' +
      '<h3 style="margin-top:0; color:#003d1f;">401(k) Match Calculator</h3>' +
      '<div style="display:grid; gap:10px; max-width:540px;">' +
        '<label>Annual Salary ($):<input id="career-match-salary" type="number" min="0" step="0.01" style="width:100%; padding:10px; border:1px solid #b3d7c5; border-radius:6px;" /></label>' +
        '<label>Your Contribution (%):<input id="career-match-contribution" type="number" min="0" step="0.01" style="width:100%; padding:10px; border:1px solid #b3d7c5; border-radius:6px;" /></label>' +
        '<label>Company Match (e.g. 50% up to 6%):<input id="career-match-company" type="text" placeholder="50% up to 6%" style="width:100%; padding:10px; border:1px solid #b3d7c5; border-radius:6px;" /></label>' +
        '<button id="career-calc-match" style="padding:12px; background:#004d2c; color:#fff; border:none; border-radius:6px; cursor:pointer; font-weight:700;">Calculate 401(k) Match</button>' +
      '</div>' +
      '<div id="career-match-results" style="margin-top:18px;"></div>' +
    '</section>' +
  '</div>';

  const annualSalaryInput = document.getElementById('career-annual-salary');
  const filingInput = document.getElementById('career-filing-status');
  const stateSelect = document.getElementById('career-state');
  const k401Input = document.getElementById('career-401k');
  const netPayButton = document.getElementById('career-calc-netpay');
  const netPayResults = document.getElementById('career-netpay-results');
  const currentSalaryInput = document.getElementById('career-current-salary');
  const newSalaryInput = document.getElementById('career-new-salary');
  const raiseButton = document.getElementById('career-calc-raise');
  const raiseResults = document.getElementById('career-raise-results');
  const matchSalaryInput = document.getElementById('career-match-salary');
  const matchContributionInput = document.getElementById('career-match-contribution');
  const matchCompanyInput = document.getElementById('career-match-company');
  const matchButton = document.getElementById('career-calc-match');
  const matchResults = document.getElementById('career-match-results');

  const updatePie = function(taxes, takeHome) {
    const chart = document.getElementById('career-tax-pie');
    if (!chart) return;
    drawCareerPieChart(chart, taxes, takeHome);
  };

  const showNetPay = function() {
    const annualSalary = parseFloat(annualSalaryInput.value) || 0;
    const selectedState = stateSelect.value;
    const stateTaxRate = getStateTaxRate(selectedState);
    const k401Rate = parseFloat(k401Input.value) || 0;
    const filingStatus = filingInput.value;

    if (annualSalary <= 0) {
      netPayResults.innerHTML = '<p style="color:#b71c1c; font-weight:700;">Enter a valid annual salary.</p>';
      return;
    }

    if (!selectedState) {
      netPayResults.innerHTML = '<p style="color:#b71c1c; font-weight:700;">Please select your state for a tax estimate.</p>';
      return;
    }

    const net = calculateNetPay(annualSalary, filingStatus, stateTaxRate, k401Rate);
    const taxSummary = net.federal + net.socialSecurity + net.medicare + net.stateTax;

    netPayResults.innerHTML = '<div style="display:grid; gap:10px; max-width:540px;">' +
      '<div style="display:flex; justify-content:space-between;"><strong>Annual Take-Home</strong><span>' + formatCareerCurrency(net.takeHomeAnnual) + '</span></div>' +
      '<div style="display:flex; justify-content:space-between;"><strong>Monthly Take-Home</strong><span>' + formatCareerCurrency(net.takeHomeMonthly) + '</span></div>' +
      '<div style="display:flex; justify-content:space-between;"><strong>Total Taxes</strong><span>' + formatCareerCurrency(taxSummary) + '</span></div>' +
      '<canvas id="career-tax-pie" width="260" height="220" style="background:#f5fdf6; border:1px solid #d3e9d4; border-radius:10px;"></canvas>' +
    '</div>';

    updatePie(taxSummary, net.takeHomeAnnual);
  };

  const showRaise = function() {
    const currentSalary = parseFloat(currentSalaryInput.value) || 0;
    const newSalary = parseFloat(newSalaryInput.value) || 0;
    const selectedState = stateSelect.value;
    if (currentSalary <= 0 || newSalary <= 0 || newSalary <= currentSalary) {
      raiseResults.innerHTML = '<p style="color:#b71c1c; font-weight:700;">Enter a valid current salary and a higher new salary.</p>';
      return;
    }

    if (!selectedState) {
      raiseResults.innerHTML = '<p style="color:#b71c1c; font-weight:700;">Please select your state to calculate the raise after taxes.</p>';
      return;
    }

    const stateTaxRate = getStateTaxRate(selectedState);
    const currentNet = calculateNetPay(currentSalary, filingInput.value, stateTaxRate, parseFloat(k401Input.value) || 0);
    const newNet = calculateNetPay(newSalary, filingInput.value, stateTaxRate, parseFloat(k401Input.value) || 0);
    const monthlyIncrease = newNet.takeHomeMonthly - currentNet.takeHomeMonthly;

    raiseResults.innerHTML = '<div style="display:grid; gap:10px; max-width:540px;">' +
      '<div style="display:flex; justify-content:space-between;"><strong>Annual Net Increase</strong><span>' + formatCareerCurrency(newNet.takeHomeAnnual - currentNet.takeHomeAnnual) + '</span></div>' +
      '<div style="display:flex; justify-content:space-between;"><strong>Effective Monthly Increase</strong><span>' + formatCareerCurrency(monthlyIncrease) + '</span></div>' +
      '<p style="margin:0; color:#555;">This helps make raises realistic by accounting for taxes and payroll deductions.</p>' +
    '</div>';
  };

  const showMatch = function() {
    const salary = parseFloat(matchSalaryInput.value) || 0;
    const contributionPct = parseFloat(matchContributionInput.value) || 0;
    const companyMatch = parseMatchString(matchCompanyInput.value);

    if (salary <= 0 || contributionPct <= 0) {
      matchResults.innerHTML = '<p style="color:#b71c1c; font-weight:700;">Enter a valid salary and your contribution rate.</p>';
      return;
    }

    const employeeContribution = salary * (contributionPct / 100);
    const matchCap = salary * (companyMatch.capPercent / 100);
    const companyContribution = Math.min(employeeContribution * (companyMatch.matchPercent / 100), matchCap);
    const totalContribution = employeeContribution + companyContribution;

    matchResults.innerHTML = '<div style="display:grid; gap:10px; max-width:540px;">' +
      '<div style="display:flex; justify-content:space-between;"><strong>Your Annual Contribution</strong><span>' + formatCareerCurrency(employeeContribution) + '</span></div>' +
      '<div style="display:flex; justify-content:space-between;"><strong>Company Match</strong><span>' + formatCareerCurrency(companyContribution) + '</span></div>' +
      '<div style="display:flex; justify-content:space-between;"><strong>Total Annual 401(k)</strong><span>' + formatCareerCurrency(totalContribution) + '</span></div>' +
      '<p style="margin:0; color:#555;">Contribute at least ' + companyMatch.capPercent + '% to receive the full employer match.</p>' +
    '</div>';
  };

  netPayButton.addEventListener('click', showNetPay);
  raiseButton.addEventListener('click', showRaise);
  matchButton.addEventListener('click', showMatch);
};

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', setupCareerTools);
} else {
  setupCareerTools();
}
