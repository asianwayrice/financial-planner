// career.js
// Career Tools: Tax Estimator, take-home pay, raise simulator, 401(k) match, cost of living comparison.

const formatCareerCurrency = function(value) {
  return '$' + value.toFixed(2);
};

const fmtCareer = function(value) {
  return value.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
};

const clamp = function(value, min, max) {
  return Math.min(Math.max(value, min), max);
};

/* ─── Federal Tax Brackets (2024) ───────────────────────────────── */
const FEDERAL_BRACKETS = {
  single: [
    { rate: 0.10, limit: 11600  },
    { rate: 0.12, limit: 47150  },
    { rate: 0.22, limit: 100525 },
    { rate: 0.24, limit: 191950 },
    { rate: 0.32, limit: 243725 },
    { rate: 0.35, limit: 609350 },
    { rate: 0.37, limit: Infinity },
  ],
  married: [
    { rate: 0.10, limit: 23200  },
    { rate: 0.12, limit: 94300  },
    { rate: 0.22, limit: 201050 },
    { rate: 0.24, limit: 383900 },
    { rate: 0.32, limit: 487450 },
    { rate: 0.35, limit: 731200 },
    { rate: 0.37, limit: Infinity },
  ],
  head: [
    { rate: 0.10, limit: 16550  },
    { rate: 0.12, limit: 63100  },
    { rate: 0.22, limit: 100500 },
    { rate: 0.24, limit: 191950 },
    { rate: 0.32, limit: 243700 },
    { rate: 0.35, limit: 609350 },
    { rate: 0.37, limit: Infinity },
  ],
};

const STANDARD_DEDUCTIONS = { single: 14600, married: 29200, head: 21900 };

const getFederalTaxDetailed = function(taxableIncome, filingStatus) {
  const brackets = FEDERAL_BRACKETS[filingStatus] || FEDERAL_BRACKETS.single;
  let tax = 0;
  let remaining = taxableIncome;
  let lowerLimit = 0;
  const breakdown = [];
  let marginalRate = 0;

  for (let i = 0; i < brackets.length; i++) {
    const bracket = brackets[i];
    const taxable = Math.max(0, Math.min(remaining, bracket.limit - lowerLimit));
    if (taxable <= 0) break;
    const bracketTax = taxable * bracket.rate;
    tax += bracketTax;
    breakdown.push({
      rate: bracket.rate,
      from: lowerLimit,
      to: Math.min(bracket.limit, taxableIncome),
      taxable,
      tax: bracketTax,
    });
    marginalRate = bracket.rate;
    remaining -= taxable;
    lowerLimit = bracket.limit;
  }

  return { tax, breakdown, marginalRate };
};

/* Legacy wrapper used by raise/match tools */
const getFederalTax = function(income, filingStatus) {
  return getFederalTaxDetailed(income, filingStatus).tax;
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
  const isDark = document.body.classList.contains('dark-mode');

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = isDark ? '#1d4a36' : '#b8d7c2';
  ctx.beginPath();
  ctx.moveTo(centerX, centerY);
  ctx.arc(centerX, centerY, radius, 0, taxAngle);
  ctx.fill();

  ctx.fillStyle = isDark ? '#34d399' : '#004d2c';
  ctx.beginPath();
  ctx.moveTo(centerX, centerY);
  ctx.arc(centerX, centerY, radius, taxAngle, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = isDark ? '#e5e7eb' : '#fff';
  ctx.font = '14px Segoe UI, system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('Taxes', centerX, centerY - 6);
  ctx.fillText('Take-Home', centerX, centerY + 14);
};

const calculateNetPay = function(annualSalary, filingStatus, stateTaxRate, kContributionPct, hsaAnnual, healthAnnual) {
  const pretax401k   = annualSalary * (kContributionPct / 100);
  const pretaxHsa    = hsaAnnual   || 0;
  const pretaxHealth = healthAnnual || 0;
  const totalPretax  = pretax401k + pretaxHsa + pretaxHealth;

  const grossAfterPretax = Math.max(0, annualSalary - totalPretax);

  // Apply standard deduction for federal
  const stdDeduction   = STANDARD_DEDUCTIONS[filingStatus] || STANDARD_DEDUCTIONS.single;
  const federalTaxable = Math.max(0, grossAfterPretax - stdDeduction);
  const { tax: federal, breakdown: federalBreakdown, marginalRate } = getFederalTaxDetailed(federalTaxable, filingStatus);

  const socialSecurity = Math.min(annualSalary, 168600) * 0.062; // 2024 SS wage base
  const medicare       = annualSalary * 0.0145;
  const addlMedicare   = annualSalary > 200000 ? (annualSalary - 200000) * 0.009 : 0;
  const stateTax       = grossAfterPretax * (stateTaxRate / 100);

  const totalTaxes     = federal + socialSecurity + medicare + addlMedicare + stateTax;
  const takeHomeAnnual = Math.max(0, annualSalary - totalPretax - totalTaxes);
  const effectiveRate  = annualSalary > 0 ? (totalTaxes / annualSalary) * 100 : 0;

  return {
    federal, federalBreakdown, marginalRate,
    socialSecurity, medicare, addlMedicare,
    stateTax, stateTaxRate,
    pretax401k, pretaxHsa, pretaxHealth, totalPretax,
    stdDeduction, federalTaxable,
    totalTaxes, takeHomeAnnual,
    takeHomeMonthly: takeHomeAnnual / 12,
    effectiveRate,
    grossAfterPretax,
  };
};

/* ─── Tax Estimator Results Renderer ────────────────────────── */
const renderTaxEstimator = function(salary, net, filingStatus, selectedState) {
  const isDark = document.body.classList.contains('dark-mode');
  const cardBg = isDark ? '#111826' : '#f8faf8';
  const borderC = isDark ? '#334155' : '#d7e8df';
  const mutedC  = isDark ? '#94a3b8' : '#555';
  const textC   = isDark ? '#e5e7eb' : '#333';
  const greenC  = isDark ? '#6ee7b7' : '#004d2c';

  const row = (label, value, highlight) =>
    `<div class="te-row ${highlight ? 'te-row--total' : ''}">
      <span class="te-row-label">${label}</span>
      <span class="te-row-value ${highlight ? 'te-row-value--highlight' : ''}">${value}</span>
    </div>`;

  const pct = v => salary > 0 ? ((v / salary) * 100).toFixed(1) + '%' : '—';

  /* Bracket breakdown rows */
  const bracketRows = net.federalBreakdown.map(b =>
    `<div class="te-bracket-row">
      <span class="te-bracket-rate">${(b.rate * 100).toFixed(0)}%</span>
      <span class="te-bracket-range">${fmtCareer(b.from)} – ${b.to === Infinity ? '∞' : fmtCareer(b.to)}</span>
      <span class="te-bracket-taxable">${fmtCareer(b.taxable)} taxed</span>
      <span class="te-bracket-tax">= ${fmtCareer(b.tax)}</span>
    </div>`
  ).join('');

  /* Stacked bar proportions */
  const segments = [
    { label: 'Federal',        value: net.federal,        color: isDark ? '#ef4444' : '#c0392b' },
    { label: 'State',          value: net.stateTax,       color: isDark ? '#f97316' : '#e67e22' },
    { label: 'Social Security',value: net.socialSecurity, color: isDark ? '#eab308' : '#d4a017' },
    { label: 'Medicare',       value: net.medicare + net.addlMedicare, color: isDark ? '#a78bfa' : '#8e44ad' },
    { label: 'Take-Home',      value: net.takeHomeAnnual, color: isDark ? '#34d399' : '#004d2c' },
  ];
  const total = segments.reduce((s, sg) => s + sg.value, 0);
  const barHtml = segments.map(sg => {
    const w = total > 0 ? ((sg.value / total) * 100).toFixed(2) : 0;
    return `<div class="te-bar-seg" style="width:${w}%; background:${sg.color};" title="${sg.label}: ${fmtCareer(sg.value)}"></div>`;
  }).join('');

  const legendHtml = segments.map(sg =>
    `<div class="te-legend-item">
      <span class="te-legend-dot" style="background:${sg.color};"></span>
      <span>${sg.label}</span>
      <span class="te-legend-val">${fmtCareer(sg.value)}</span>
    </div>`
  ).join('');

  const noTax = ['AK','FL','NV','SD','TN','TX','WA','WY','NH'];
  const stateLine = noTax.includes(selectedState)
    ? `${selectedState} has no state income tax`
    : `${selectedState} flat rate ≈ ${net.stateTaxRate.toFixed(2)}%`;

  return `
<div class="te-wrap">

  <!-- Take-home headline -->
  <div class="te-headline-grid">
    <div class="te-headline-card te-headline-card--main">
      <span class="te-headline-label">Annual Take-Home</span>
      <span class="te-headline-value">${fmtCareer(net.takeHomeAnnual)}</span>
    </div>
    <div class="te-headline-card">
      <span class="te-headline-label">Monthly Take-Home</span>
      <span class="te-headline-value">${fmtCareer(net.takeHomeMonthly)}</span>
    </div>
    <div class="te-headline-card te-headline-card--tax">
      <span class="te-headline-label">Total Tax Burden</span>
      <span class="te-headline-value">${fmtCareer(net.totalTaxes)}</span>
    </div>
    <div class="te-headline-card">
      <span class="te-headline-label">Effective Tax Rate</span>
      <span class="te-headline-value">${net.effectiveRate.toFixed(1)}%</span>
    </div>
    <div class="te-headline-card">
      <span class="te-headline-label">Marginal Rate</span>
      <span class="te-headline-value">${(net.marginalRate * 100).toFixed(0)}%</span>
    </div>
  </div>

  <!-- Stacked bar -->
  <div class="te-card">
    <p class="te-card-title">Dollar Breakdown</p>
    <div class="te-bar">${barHtml}</div>
    <div class="te-legend">${legendHtml}</div>
  </div>

  <!-- Pre-tax deductions -->
  ${net.totalPretax > 0 ? `
  <div class="te-card">
    <p class="te-card-title">Pre-Tax Deductions</p>
    ${net.pretax401k   > 0 ? row('401(k) contribution', `– ${fmtCareer(net.pretax401k)} (${pct(net.pretax401k)})`) : ''}
    ${net.pretaxHsa    > 0 ? row('HSA contribution',    `– ${fmtCareer(net.pretaxHsa)}`) : ''}
    ${net.pretaxHealth > 0 ? row('Health insurance',    `– ${fmtCareer(net.pretaxHealth)}`) : ''}
    ${row('Gross after pre-tax', fmtCareer(net.grossAfterPretax))}
  </div>` : ''}

  <!-- Federal tax detail -->
  <div class="te-card">
    <p class="te-card-title">Federal Income Tax</p>
    <p class="te-card-note">Standard deduction: ${fmtCareer(net.stdDeduction)} → Federal taxable income: ${fmtCareer(net.federalTaxable)}</p>
    <div class="te-brackets">${bracketRows}</div>
    ${row('Federal income tax', fmtCareer(net.federal) + ' (' + pct(net.federal) + ' of gross)')}
    <p class="te-card-note" style="margin-top:8px;">Marginal rate: <strong>${(net.marginalRate * 100).toFixed(0)}%</strong> &nbsp;|&nbsp; Effective federal rate: <strong>${salary > 0 ? ((net.federal / salary) * 100).toFixed(1) : 0}%</strong></p>
  </div>

  <!-- FICA + State -->
  <div class="te-card">
    <p class="te-card-title">Payroll & State Taxes</p>
    ${row('Social Security (6.2%, up to $168,600)', fmtCareer(net.socialSecurity))}
    ${row('Medicare (1.45%)', fmtCareer(net.medicare))}
    ${net.addlMedicare > 0 ? row('Additional Medicare (0.9% over $200k)', fmtCareer(net.addlMedicare)) : ''}
    ${row(`State income tax (${stateLine})`, fmtCareer(net.stateTax))}
    ${row('Total taxes', fmtCareer(net.totalTaxes) + ' (' + pct(net.totalTaxes) + ' of gross)', true)}
  </div>

</div>

<style>
.te-wrap { display:grid; gap:14px; }

.te-headline-grid {
  display:grid;
  grid-template-columns:repeat(auto-fit, minmax(140px,1fr));
  gap:10px;
}
.te-headline-card {
  background:var(--surface,#fff);
  border:1px solid var(--border,#d7e8df);
  border-radius:12px;
  padding:14px 16px;
  display:flex; flex-direction:column; gap:4px;
}
.te-headline-card--main { border-left:4px solid #004d2c; }
.te-headline-card--tax  { border-left:4px solid #c0392b; }
.te-headline-label {
  font-size:0.72rem; font-weight:700;
  text-transform:uppercase; letter-spacing:0.05em;
  color:var(--muted,#666);
}
.te-headline-value { font-size:1.2rem; font-weight:700; color:var(--text,#333); }
.te-headline-card--main .te-headline-value { color:#004d2c; }
.te-headline-card--tax  .te-headline-value { color:#c0392b; }

.te-card {
  background:var(--surface-soft,#f8faf8);
  border:1px solid var(--border,#d7e8df);
  border-radius:12px;
  padding:16px 18px;
  display:grid; gap:8px;
}
.te-card-title {
  font-size:0.82rem; font-weight:700;
  text-transform:uppercase; letter-spacing:0.05em;
  color:var(--muted,#555);
  margin:0 0 2px;
}
.te-card-note {
  font-size:0.82rem;
  color:var(--muted,#666);
  margin:0;
}

/* Stacked bar */
.te-bar {
  display:flex; height:22px; border-radius:8px;
  overflow:hidden; gap:2px;
}
.te-bar-seg { height:100%; min-width:2px; transition:opacity 0.2s; }
.te-bar-seg:hover { opacity:0.8; cursor:default; }

.te-legend {
  display:grid;
  grid-template-columns:repeat(auto-fit,minmax(150px,1fr));
  gap:6px;
  margin-top:4px;
}
.te-legend-item {
  display:flex; align-items:center; gap:7px;
  font-size:0.82rem; color:var(--text,#333);
}
.te-legend-dot {
  width:10px; height:10px; border-radius:3px; flex-shrink:0;
}
.te-legend-val { margin-left:auto; font-weight:600; font-size:0.82rem; }

/* Bracket breakdown */
.te-brackets { display:grid; gap:4px; }
.te-bracket-row {
  display:grid;
  grid-template-columns:40px 1fr 1fr 1fr;
  gap:6px;
  font-size:0.82rem;
  padding:5px 8px;
  background:var(--surface,#fff);
  border-radius:7px;
  border:1px solid var(--border,#e5e5e5);
  align-items:center;
}
.te-bracket-rate  { font-weight:700; color:#c0392b; }
.te-bracket-range { color:var(--muted,#666); }
.te-bracket-taxable { color:var(--muted,#666); }
.te-bracket-tax   { font-weight:600; text-align:right; color:var(--text,#333); }

/* Summary rows */
.te-row {
  display:flex; justify-content:space-between; align-items:center;
  padding:5px 0;
  border-bottom:1px solid var(--border,#e5e7eb);
  font-size:0.9rem;
}
.te-row:last-child { border-bottom:none; }
.te-row--total {
  padding-top:8px; margin-top:4px;
  border-top:2px solid var(--border,#d7e8df);
  border-bottom:none;
}
.te-row-label { color:var(--muted,#555); }
.te-row-value { font-weight:600; color:var(--text,#333); }
.te-row-value--highlight { color:#c0392b; font-size:1rem; }

/* Dark mode */
body.dark-mode .te-headline-card,
body.dark-mode .te-card {
  background-color:#111826 !important;
  border-color:#334155 !important;
}
body.dark-mode .te-headline-card--main { border-left-color:#34d399 !important; }
body.dark-mode .te-headline-card--tax  { border-left-color:#f87171 !important; }
body.dark-mode .te-headline-card--main .te-headline-value { color:#34d399 !important; }
body.dark-mode .te-headline-card--tax  .te-headline-value { color:#f87171 !important; }
body.dark-mode .te-headline-value,
body.dark-mode .te-row-value           { color:#e5e7eb !important; }
body.dark-mode .te-headline-label,
body.dark-mode .te-card-title,
body.dark-mode .te-card-note,
body.dark-mode .te-row-label,
body.dark-mode .te-bracket-range,
body.dark-mode .te-bracket-taxable,
body.dark-mode .te-legend-item         { color:#94a3b8 !important; }
body.dark-mode .te-bracket-row {
  background-color:#0f1720 !important;
  border-color:#334155 !important;
}
body.dark-mode .te-bracket-tax         { color:#e5e7eb !important; }
body.dark-mode .te-bracket-rate        { color:#f87171 !important; }
body.dark-mode .te-row-value--highlight { color:#f87171 !important; }
body.dark-mode .te-row                 { border-bottom-color:#1e293b !important; }
</style>
`;
};

/* ─── COL helpers (unchanged) ────────────────────────────────── */
const colData = {
  'New York, NY':        { col: 187, housing: 320 },
  'San Francisco, CA':   { col: 194, housing: 412 },
  'San Jose, CA':        { col: 183, housing: 390 },
  'Los Angeles, CA':     { col: 163, housing: 290 },
  'San Diego, CA':       { col: 156, housing: 268 },
  'Boston, MA':          { col: 162, housing: 272 },
  'Seattle, WA':         { col: 155, housing: 255 },
  'Washington, DC':      { col: 158, housing: 265 },
  'Miami, FL':           { col: 123, housing: 145 },
  'Chicago, IL':         { col: 107, housing: 108 },
  'Denver, CO':          { col: 128, housing: 158 },
  'Portland, OR':        { col: 133, housing: 172 },
  'Austin, TX':          { col: 120, housing: 148 },
  'Honolulu, HI':        { col: 196, housing: 350 },
  'Dallas, TX':          { col: 103, housing: 98  },
  'Houston, TX':         { col: 98,  housing: 85  },
  'Phoenix, AZ':         { col: 104, housing: 102 },
  'Atlanta, GA':         { col: 104, housing: 98  },
  'Minneapolis, MN':     { col: 112, housing: 118 },
  'Nashville, TN':       { col: 110, housing: 118 },
  'Charlotte, NC':       { col: 101, housing: 95  },
  'Raleigh, NC':         { col: 103, housing: 98  },
  'Salt Lake City, UT':  { col: 109, housing: 116 },
  'Las Vegas, NV':       { col: 107, housing: 108 },
  'Sacramento, CA':      { col: 132, housing: 168 },
  'San Antonio, TX':     { col: 92,  housing: 78  },
  'Tampa, FL':           { col: 105, housing: 104 },
  'Orlando, FL':         { col: 103, housing: 99  },
  'Pittsburgh, PA':      { col: 93,  housing: 75  },
  'Columbus, OH':        { col: 91,  housing: 73  },
  'Indianapolis, IN':    { col: 89,  housing: 68  },
  'Kansas City, MO':     { col: 90,  housing: 70  },
  'St. Louis, MO':       { col: 88,  housing: 65  },
  'Cincinnati, OH':      { col: 88,  housing: 62  },
  'Cleveland, OH':       { col: 86,  housing: 58  },
  'Detroit, MI':         { col: 90,  housing: 68  },
  'Milwaukee, WI':       { col: 93,  housing: 74  },
  'Richmond, VA':        { col: 97,  housing: 87  },
  'Baltimore, MD':       { col: 118, housing: 130 },
  'Philadelphia, PA':    { col: 116, housing: 128 },
  'Louisville, KY':      { col: 88,  housing: 63  },
  'Memphis, TN':         { col: 83,  housing: 55  },
  'New Orleans, LA':     { col: 98,  housing: 88  },
  'Oklahoma City, OK':   { col: 84,  housing: 57  },
  'Tulsa, OK':           { col: 82,  housing: 55  },
  'Albuquerque, NM':     { col: 90,  housing: 72  },
  'El Paso, TX':         { col: 82,  housing: 54  },
  'Tucson, AZ':          { col: 96,  housing: 85  },
  'Omaha, NE':           { col: 88,  housing: 65  },
  'Boise, ID':           { col: 106, housing: 112 },
  'Spokane, WA':         { col: 99,  housing: 90  },
  'Anchorage, AK':       { col: 130, housing: 155 },
  'Hartford, CT':        { col: 128, housing: 142 },
  'Providence, RI':      { col: 120, housing: 132 },
  'Buffalo, NY':         { col: 90,  housing: 68  },
  'Rochester, NY':       { col: 93,  housing: 72  },
  'Birmingham, AL':      { col: 83,  housing: 55  },
  'Jackson, MS':         { col: 79,  housing: 48  },
  'Des Moines, IA':      { col: 88,  housing: 65  },
  'Madison, WI':         { col: 103, housing: 100 },
};

const colCities = Object.keys(colData).sort();

const stateSelectHTML = () => `
  <option value="">Select state</option>
  <option value="AL">Alabama</option><option value="AK">Alaska</option><option value="AZ">Arizona</option>
  <option value="AR">Arkansas</option><option value="CA">California</option><option value="CO">Colorado</option>
  <option value="CT">Connecticut</option><option value="DE">Delaware</option><option value="DC">Washington DC</option>
  <option value="FL">Florida</option><option value="GA">Georgia</option><option value="HI">Hawaii</option>
  <option value="ID">Idaho</option><option value="IL">Illinois</option><option value="IN">Indiana</option>
  <option value="IA">Iowa</option><option value="KS">Kansas</option><option value="KY">Kentucky</option>
  <option value="LA">Louisiana</option><option value="ME">Maine</option><option value="MD">Maryland</option>
  <option value="MA">Massachusetts</option><option value="MI">Michigan</option><option value="MN">Minnesota</option>
  <option value="MS">Mississippi</option><option value="MO">Missouri</option><option value="MT">Montana</option>
  <option value="NE">Nebraska</option><option value="NV">Nevada</option><option value="NH">New Hampshire</option>
  <option value="NJ">New Jersey</option><option value="NM">New Mexico</option><option value="NY">New York</option>
  <option value="NC">North Carolina</option><option value="ND">North Dakota</option><option value="OH">Ohio</option>
  <option value="OK">Oklahoma</option><option value="OR">Oregon</option><option value="PA">Pennsylvania</option>
  <option value="RI">Rhode Island</option><option value="SC">South Carolina</option><option value="SD">South Dakota</option>
  <option value="TN">Tennessee</option><option value="TX">Texas</option><option value="UT">Utah</option>
  <option value="VT">Vermont</option><option value="VA">Virginia</option><option value="WA">Washington</option>
  <option value="WV">West Virginia</option><option value="WI">Wisconsin</option><option value="WY">Wyoming</option>
`;

const cityOptions = () => colCities.map(c => `<option value="${c}">${c}</option>`).join('');

const verdictHTML = (realDiff, pctDiff, newCity, oldCity) => {
  const abs = Math.abs(realDiff);
  const better = realDiff >= 0;
  const strongThreshold = 5000;
  let icon, label, msg;

  if (Math.abs(pctDiff) < 1) {
    icon = '⚖️'; label = 'Roughly a wash';
    msg = `After adjusting for cost of living, the two salaries have almost identical purchasing power. The move is financially neutral — let lifestyle, career growth, and personal fit decide.`;
  } else if (better && abs >= strongThreshold) {
    icon = '✅'; label = 'Financially worth it';
    msg = `Moving to <strong>${newCity}</strong> puts <strong>${fmtCareer(abs)}</strong> more in your pocket every year in real purchasing power. That's a meaningful gain — you'd be genuinely better off.`;
  } else if (better) {
    icon = '📈'; label = 'Slight real gain';
    msg = `You'd have a modest real advantage of <strong>${fmtCareer(abs)}/yr</strong> in <strong>${newCity}</strong>. It's a real improvement but not dramatic — worth factoring in other quality-of-life considerations too.`;
  } else if (abs >= strongThreshold) {
    icon = '⚠️'; label = 'Watch out — you may fall behind';
    msg = `Despite the higher nominal salary, the higher cost of living in <strong>${newCity}</strong> means you'd lose <strong>${fmtCareer(abs)}</strong> in real annual purchasing power compared to staying in <strong>${oldCity}</strong>.`;
  } else {
    icon = '📉'; label = 'Slight real loss';
    msg = `The cost of living edge means <strong>${oldCity}</strong> stretches your money a little further. The real difference is <strong>${fmtCareer(abs)}/yr</strong> — small, but something to keep in mind when negotiating.`;
  }

  const bg     = better ? (document.body.classList.contains('dark-mode') ? '#0d2e1e' : '#f0faf4') : (document.body.classList.contains('dark-mode') ? '#2a1010' : '#fff8f0');
  const border = better ? '#004d2c' : '#c0392b';

  return `<div style="border-left:4px solid ${border}; background:${bg}; border-radius:8px; padding:14px 16px; margin-top:4px;">
    <p style="margin:0 0 6px; font-size:1rem; font-weight:700;">${icon} ${label}</p>
    <p style="margin:0; font-size:0.9rem; line-height:1.6;">${msg}</p>
  </div>`;
};

const runColCalc = () => {
  const fromCity  = document.getElementById('col-from-city').value;
  const toCity    = document.getElementById('col-to-city').value;
  const fromSal   = parseFloat(document.getElementById('col-from-salary').value) || 0;
  const toSal     = parseFloat(document.getElementById('col-to-salary').value)   || 0;
  const results   = document.getElementById('col-results');

  if (!fromCity || !toCity) { results.innerHTML = '<p style="color:#b71c1c; font-weight:700;">Please select both cities.</p>'; return; }
  if (fromSal <= 0 || toSal <= 0) { results.innerHTML = '<p style="color:#b71c1c; font-weight:700;">Please enter valid salaries for both locations.</p>'; return; }
  if (fromCity === toCity) { results.innerHTML = '<p style="color:#b71c1c; font-weight:700;">Please select two different cities.</p>'; return; }

  const from = colData[fromCity];
  const to   = colData[toCity];
  const toSalAdjusted  = toSal * (from.col / to.col);
  const realDiff       = toSalAdjusted - fromSal;
  const pctDiff        = ((toSalAdjusted - fromSal) / fromSal) * 100;
  const equivalentNeeded = fromSal * (to.col / from.col);
  const salaryGap      = toSal - equivalentNeeded;

  const rowStyle   = 'display:flex; justify-content:space-between; padding:6px 0; border-bottom:1px solid var(--border,#e5e7eb); font-size:0.92rem;';
  const labelStyle = 'color:var(--muted,#555);';
  const valueStyle = 'font-weight:600;';
  const isDark     = document.body.classList.contains('dark-mode');
  const tableBg    = isDark ? '#111826' : '#f8faf8';

  results.innerHTML = `
    <div style="display:grid; gap:16px; margin-top:8px;">
      <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px;">
        <div style="background:${tableBg}; border:1px solid var(--border,#d7e8df); border-radius:10px; padding:14px;">
          <p style="margin:0 0 6px; font-size:0.75rem; font-weight:700; text-transform:uppercase; letter-spacing:0.05em; color:var(--muted,#666);">Current</p>
          <p style="margin:0 0 4px; font-weight:700; font-size:0.95rem;">${fromCity}</p>
          <p style="margin:0; font-size:1.25rem; font-weight:700; color:#004d2c;">${fmtCareer(fromSal)}</p>
          <p style="margin:4px 0 0; font-size:0.78rem; color:var(--muted,#666);">COL index: ${from.col}</p>
        </div>
        <div style="background:${tableBg}; border:1px solid var(--border,#d7e8df); border-radius:10px; padding:14px;">
          <p style="margin:0 0 6px; font-size:0.75rem; font-weight:700; text-transform:uppercase; letter-spacing:0.05em; color:var(--muted,#666);">New offer</p>
          <p style="margin:0 0 4px; font-weight:700; font-size:0.95rem;">${toCity}</p>
          <p style="margin:0; font-size:1.25rem; font-weight:700; color:#2563eb;">${fmtCareer(toSal)}</p>
          <p style="margin:4px 0 0; font-size:0.78rem; color:var(--muted,#666);">COL index: ${to.col}</p>
        </div>
      </div>
      <div style="background:${tableBg}; border:1px solid var(--border,#d7e8df); border-radius:10px; padding:14px;">
        <div style="${rowStyle}"><span style="${labelStyle}">New salary in today's purchasing power</span><span style="${valueStyle}">${fmtCareer(toSalAdjusted)}</span></div>
        <div style="${rowStyle}"><span style="${labelStyle}">Real annual difference</span><span style="${valueStyle}; color:${realDiff >= 0 ? '#004d2c' : '#c0392b'};">${realDiff >= 0 ? '+' : ''}${fmtCareer(realDiff)}</span></div>
        <div style="${rowStyle}"><span style="${labelStyle}">Real purchasing power change</span><span style="${valueStyle}; color:${pctDiff >= 0 ? '#004d2c' : '#c0392b'};">${pctDiff >= 0 ? '+' : ''}${pctDiff.toFixed(1)}%</span></div>
        <div style="display:flex; justify-content:space-between; padding:6px 0; font-size:0.92rem;"><span style="${labelStyle}">Salary needed in ${toCity} to match current lifestyle</span><span style="${valueStyle}">${fmtCareer(equivalentNeeded)}</span></div>
      </div>
      ${salaryGap < 0
        ? `<p style="font-size:0.85rem; background:${isDark ? '#1e2a1e' : '#f0faf4'}; border:1px solid #b3d7c5; border-radius:8px; padding:10px 14px; margin:0; color:${isDark ? '#6ee7b7' : '#004d2c'};">💡 <strong>Negotiation tip:</strong> You'd need at least <strong>${fmtCareer(equivalentNeeded)}</strong> in ${toCity} to maintain your current standard of living. Your offer is ${fmtCareer(Math.abs(salaryGap))} short — use this number to negotiate.</p>`
        : `<p style="font-size:0.85rem; background:${isDark ? '#1e2a1e' : '#f0faf4'}; border:1px solid #b3d7c5; border-radius:8px; padding:10px 14px; margin:0; color:${isDark ? '#6ee7b7' : '#004d2c'};">💡 The offer already exceeds the break-even salary of <strong>${fmtCareer(equivalentNeeded)}</strong>. You have real room to gain.</p>`
      }
      ${verdictHTML(realDiff, pctDiff, toCity, fromCity)}
    </div>
  `;
};

/* ═══════════════════════════════════════════════════════════════
   MAIN SETUP
═══════════════════════════════════════════════════════════════ */
const setupCareerTools = function() {
  const careerContainer = document.getElementById('career-container');
  if (!careerContainer) return;

  careerContainer.innerHTML = '<div style="display:grid; gap:24px;">' +

    /* ══ TAX ESTIMATOR (upgraded) ══ */
    '<section style="background:#ffffff; padding:20px; border-radius:12px; border:1px solid #d7e8df; box-shadow:0 2px 8px rgba(0,0,0,0.05);">' +
      '<h3 style="margin-top:0; color:#003d1f;">🧾 Tax Estimator</h3>' +
      '<p style="margin:0 0 14px; color:#555; font-size:0.92rem;">Enter your gross salary and deductions to see a full federal bracket breakdown, FICA, state tax, effective rate, and real take-home pay.</p>' +
      '<div style="display:grid; grid-template-columns:repeat(auto-fit,minmax(200px,1fr)); gap:12px; max-width:680px;">' +
        '<div style="display:flex; flex-direction:column; gap:5px;">' +
          '<label style="font-size:0.78rem; font-weight:700; text-transform:uppercase; letter-spacing:0.04em; color:#555;">Annual Gross Salary ($)</label>' +
          '<input id="te-salary" type="number" min="0" step="1000" placeholder="e.g. 75000" style="padding:10px; border:1px solid #b3d7c5; border-radius:10px; font-size:0.95rem; width:100%; box-sizing:border-box; margin:0;" />' +
        '</div>' +
        '<div style="display:flex; flex-direction:column; gap:5px;">' +
          '<label style="font-size:0.78rem; font-weight:700; text-transform:uppercase; letter-spacing:0.04em; color:#555;">Filing Status</label>' +
          '<select id="te-filing" style="padding:10px; border:1px solid #b3d7c5; border-radius:10px; font-size:0.95rem; width:100%; box-sizing:border-box; margin:0;">' +
            '<option value="single">Single</option>' +
            '<option value="married">Married Filing Jointly</option>' +
            '<option value="head">Head of Household</option>' +
          '</select>' +
        '</div>' +
        '<div style="display:flex; flex-direction:column; gap:5px;">' +
          '<label style="font-size:0.78rem; font-weight:700; text-transform:uppercase; letter-spacing:0.04em; color:#555;">State</label>' +
          '<select id="te-state" style="padding:10px; border:1px solid #b3d7c5; border-radius:10px; font-size:0.95rem; width:100%; box-sizing:border-box; margin:0;">' + stateSelectHTML() + '</select>' +
        '</div>' +
        '<div style="display:flex; flex-direction:column; gap:5px;">' +
          '<label style="font-size:0.78rem; font-weight:700; text-transform:uppercase; letter-spacing:0.04em; color:#555;">401(k) Contribution (%)</label>' +
          '<input id="te-401k" type="number" min="0" max="100" step="0.5" placeholder="e.g. 6" style="padding:10px; border:1px solid #b3d7c5; border-radius:10px; font-size:0.95rem; width:100%; box-sizing:border-box; margin:0;" />' +
        '</div>' +
        '<div style="display:flex; flex-direction:column; gap:5px;">' +
          '<label style="font-size:0.78rem; font-weight:700; text-transform:uppercase; letter-spacing:0.04em; color:#555;">HSA Contribution ($/yr)</label>' +
          '<input id="te-hsa" type="number" min="0" step="100" placeholder="e.g. 3850" style="padding:10px; border:1px solid #b3d7c5; border-radius:10px; font-size:0.95rem; width:100%; box-sizing:border-box; margin:0;" />' +
        '</div>' +
        '<div style="display:flex; flex-direction:column; gap:5px;">' +
          '<label style="font-size:0.78rem; font-weight:700; text-transform:uppercase; letter-spacing:0.04em; color:#555;">Health Insurance Premium ($/yr)</label>' +
          '<input id="te-health" type="number" min="0" step="100" placeholder="e.g. 2400" style="padding:10px; border:1px solid #b3d7c5; border-radius:10px; font-size:0.95rem; width:100%; box-sizing:border-box; margin:0;" />' +
        '</div>' +
      '</div>' +
      '<button id="te-calc-btn" style="margin-top:16px; padding:12px 28px; background:#004d2c; color:#fff; border:none; border-radius:10px; cursor:pointer; font-weight:700; font-size:0.95rem;">Estimate My Taxes</button>' +
      '<div id="te-results" style="margin-top:20px;"></div>' +
    '</section>' +

    /* ── Raise Simulator ── */
    '<section style="background:#ffffff; padding:20px; border-radius:12px; border:1px solid #d7e8df; box-shadow:0 2px 8px rgba(0,0,0,0.05);">' +
      '<h3 style="margin-top:0; color:#003d1f;">Raise & Promotion Simulator</h3>' +
      '<div style="display:grid; gap:10px; max-width:540px;">' +
        '<label>Current Salary ($):<input id="career-current-salary" type="number" min="0" step="0.01" style="width:100%; padding:10px; border:1px solid #b3d7c5; border-radius:10px; margin:4px 0 0; box-sizing:border-box;" /></label>' +
        '<label>New Salary ($):<input id="career-new-salary" type="number" min="0" step="0.01" style="width:100%; padding:10px; border:1px solid #b3d7c5; border-radius:10px; margin:4px 0 0; box-sizing:border-box;" /></label>' +
        '<label>Filing Status:<select id="career-filing-status" style="width:100%; padding:10px; border:1px solid #b3d7c5; border-radius:10px; margin:4px 0 0; box-sizing:border-box;"><option value="single">Single</option><option value="married">Married</option><option value="head">Head of Household</option></select></label>' +
        '<label>State:<select id="career-state" style="width:100%; padding:10px; border:1px solid #b3d7c5; border-radius:10px; margin:4px 0 0; box-sizing:border-box;">' + stateSelectHTML() + '</select></label>' +
        '<button id="career-calc-raise" style="padding:12px; background:#004d2c; color:#fff; border:none; border-radius:10px; cursor:pointer; font-weight:700;">Show Effective Monthly Increase</button>' +
      '</div>' +
      '<div id="career-raise-results" style="margin-top:18px;"></div>' +
    '</section>' +

    /* ── 401(k) Match ── */
    '<section style="background:#ffffff; padding:20px; border-radius:12px; border:1px solid #d7e8df; box-shadow:0 2px 8px rgba(0,0,0,0.05);">' +
      '<h3 style="margin-top:0; color:#003d1f;">401(k) Match Calculator</h3>' +
      '<div style="display:grid; gap:10px; max-width:540px;">' +
        '<label>Annual Salary ($):<input id="career-match-salary" type="number" min="0" step="0.01" style="width:100%; padding:10px; border:1px solid #b3d7c5; border-radius:10px; margin:4px 0 0; box-sizing:border-box;" /></label>' +
        '<label>Your Contribution (%):<input id="career-match-contribution" type="number" min="0" step="0.01" style="width:100%; padding:10px; border:1px solid #b3d7c5; border-radius:10px; margin:4px 0 0; box-sizing:border-box;" /></label>' +
        '<label>Company Match (e.g. 50% up to 6%):<input id="career-match-company" type="text" placeholder="50% up to 6%" style="width:100%; padding:10px; border:1px solid #b3d7c5; border-radius:10px; margin:4px 0 0; box-sizing:border-box;" /></label>' +
        '<button id="career-calc-match" style="padding:12px; background:#004d2c; color:#fff; border:none; border-radius:10px; cursor:pointer; font-weight:700;">Calculate 401(k) Match</button>' +
      '</div>' +
      '<div id="career-match-results" style="margin-top:18px;"></div>' +
    '</section>' +

    /* ── Cost of Living ── */
    '<section style="background:#ffffff; padding:20px; border-radius:12px; border:1px solid #d7e8df; box-shadow:0 2px 8px rgba(0,0,0,0.05);">' +
      '<h3 style="margin-top:0; color:#003d1f;">Cost of Living Comparison</h3>' +
      '<p style="margin:0 0 14px; color:#555; font-size:0.92rem;">Compare two job offers across different cities. Find out whether a higher salary in a new city actually gives you <em>more</em> spending power — or less.</p>' +
      '<div style="display:grid; grid-template-columns:1fr 1fr; gap:16px; max-width:640px;">' +
        '<div style="display:grid; gap:10px;">' +
          '<p style="margin:0; font-weight:700; font-size:0.85rem; text-transform:uppercase; letter-spacing:0.04em; color:#004d2c;">Current City</p>' +
          '<label style="display:flex; flex-direction:column; gap:4px; font-size:0.88rem;">City<select id="col-from-city" style="padding:10px; border:1px solid #b3d7c5; border-radius:10px; width:100%;"><option value="">Select city</option>' + cityOptions() + '</select></label>' +
          '<label style="display:flex; flex-direction:column; gap:4px; font-size:0.88rem;">Current Salary ($)<input id="col-from-salary" type="number" min="0" step="1000" placeholder="e.g. 70000" style="padding:10px; border:1px solid #b3d7c5; border-radius:10px;" /></label>' +
        '</div>' +
        '<div style="display:grid; gap:10px;">' +
          '<p style="margin:0; font-weight:700; font-size:0.85rem; text-transform:uppercase; letter-spacing:0.04em; color:#2563eb;">New City</p>' +
          '<label style="display:flex; flex-direction:column; gap:4px; font-size:0.88rem;">City<select id="col-to-city" style="padding:10px; border:1px solid #b3d7c5; border-radius:10px; width:100%;"><option value="">Select city</option>' + cityOptions() + '</select></label>' +
          '<label style="display:flex; flex-direction:column; gap:4px; font-size:0.88rem;">New Salary ($)<input id="col-to-salary" type="number" min="0" step="1000" placeholder="e.g. 90000" style="padding:10px; border:1px solid #b3d7c5; border-radius:10px;" /></label>' +
        '</div>' +
      '</div>' +
      '<button id="col-compare-btn" style="margin-top:16px; padding:12px 24px; background:#004d2c; color:#fff; border:none; border-radius:10px; cursor:pointer; font-weight:700;">Compare Cities</button>' +
      '<div id="col-results" style="margin-top:18px;"></div>' +
    '</section>' +

  '</div>';

  /* ── Wire: Tax Estimator ── */
  document.getElementById('te-calc-btn').addEventListener('click', () => {
    const salary  = parseFloat(document.getElementById('te-salary').value)  || 0;
    const filing  = document.getElementById('te-filing').value;
    const state   = document.getElementById('te-state').value;
    const k401    = parseFloat(document.getElementById('te-401k').value)    || 0;
    const hsa     = parseFloat(document.getElementById('te-hsa').value)     || 0;
    const health  = parseFloat(document.getElementById('te-health').value)  || 0;
    const results = document.getElementById('te-results');

    if (salary <= 0) {
      results.innerHTML = '<p style="color:#b71c1c; font-weight:700;">Please enter a valid annual salary.</p>';
      return;
    }
    if (!state) {
      results.innerHTML = '<p style="color:#b71c1c; font-weight:700;">Please select your state.</p>';
      return;
    }

    const stateRate = getStateTaxRate(state);
    const net = calculateNetPay(salary, filing, stateRate, k401, hsa, health);
    results.innerHTML = renderTaxEstimator(salary, net, filing, state);
  });

  /* ── Wire: Raise Simulator ── */
  document.getElementById('career-calc-raise').addEventListener('click', () => {
    const currentSalary = parseFloat(document.getElementById('career-current-salary').value) || 0;
    const newSalary     = parseFloat(document.getElementById('career-new-salary').value)     || 0;
    const filing        = document.getElementById('career-filing-status').value;
    const state         = document.getElementById('career-state').value;
    const raiseResults  = document.getElementById('career-raise-results');

    if (currentSalary <= 0 || newSalary <= 0 || newSalary <= currentSalary) {
      raiseResults.innerHTML = '<p style="color:#b71c1c; font-weight:700;">Enter a valid current salary and a higher new salary.</p>';
      return;
    }
    if (!state) {
      raiseResults.innerHTML = '<p style="color:#b71c1c; font-weight:700;">Please select your state.</p>';
      return;
    }

    const stateRate   = getStateTaxRate(state);
    const currentNet  = calculateNetPay(currentSalary, filing, stateRate, 0, 0, 0);
    const newNet      = calculateNetPay(newSalary,     filing, stateRate, 0, 0, 0);
    const annualGain  = newNet.takeHomeAnnual  - currentNet.takeHomeAnnual;
    const monthlyGain = newNet.takeHomeMonthly - currentNet.takeHomeMonthly;
    const nominalPct  = ((newSalary - currentSalary) / currentSalary * 100).toFixed(1);
    const realPct     = (annualGain / currentNet.takeHomeAnnual * 100).toFixed(1);

    raiseResults.innerHTML =
      '<div style="display:grid; gap:8px; max-width:540px;">' +
        `<div style="display:flex; justify-content:space-between; padding:5px 0; border-bottom:1px solid var(--border,#e5e7eb);"><span style="color:var(--muted,#555);">Nominal raise</span><span style="font-weight:600;">${nominalPct}%</span></div>` +
        `<div style="display:flex; justify-content:space-between; padding:5px 0; border-bottom:1px solid var(--border,#e5e7eb);"><span style="color:var(--muted,#555);">Annual net increase (after taxes)</span><span style="font-weight:600; color:#004d2c;">${fmtCareer(annualGain)}</span></div>` +
        `<div style="display:flex; justify-content:space-between; padding:5px 0; border-bottom:1px solid var(--border,#e5e7eb);"><span style="color:var(--muted,#555);">Monthly net increase</span><span style="font-weight:600; color:#004d2c;">${fmtCareer(monthlyGain)}</span></div>` +
        `<div style="display:flex; justify-content:space-between; padding:5px 0;"><span style="color:var(--muted,#555);">Real take-home increase</span><span style="font-weight:600;">${realPct}%</span></div>` +
        `<p style="margin:4px 0 0; font-size:0.85rem; color:var(--muted,#666);">A ${nominalPct}% raise translates to a <strong>${realPct}%</strong> real increase in take-home pay after taxes.</p>` +
      '</div>';
  });

  /* ── Wire: 401(k) Match ── */
  document.getElementById('career-calc-match').addEventListener('click', () => {
    const salary          = parseFloat(document.getElementById('career-match-salary').value)       || 0;
    const contributionPct = parseFloat(document.getElementById('career-match-contribution').value)  || 0;
    const companyMatch    = parseMatchString(document.getElementById('career-match-company').value);
    const matchResults    = document.getElementById('career-match-results');

    if (salary <= 0 || contributionPct <= 0) {
      matchResults.innerHTML = '<p style="color:#b71c1c; font-weight:700;">Enter a valid salary and your contribution rate.</p>';
      return;
    }

    const employeeContribution = salary * (contributionPct / 100);
    const matchCap             = salary * (companyMatch.capPercent / 100);
    const companyContribution  = Math.min(employeeContribution * (companyMatch.matchPercent / 100), matchCap);
    const totalContribution    = employeeContribution + companyContribution;

    matchResults.innerHTML =
      '<div style="display:grid; gap:8px; max-width:540px;">' +
        `<div style="display:flex; justify-content:space-between; padding:5px 0; border-bottom:1px solid var(--border,#e5e7eb);"><span style="color:var(--muted,#555);">Your annual contribution</span><span style="font-weight:600;">${fmtCareer(employeeContribution)}</span></div>` +
        `<div style="display:flex; justify-content:space-between; padding:5px 0; border-bottom:1px solid var(--border,#e5e7eb);"><span style="color:var(--muted,#555);">Company match</span><span style="font-weight:600; color:#004d2c;">${fmtCareer(companyContribution)}</span></div>` +
        `<div style="display:flex; justify-content:space-between; padding:5px 0;"><span style="color:var(--muted,#555);">Total annual 401(k)</span><span style="font-weight:600;">${fmtCareer(totalContribution)}</span></div>` +
        `<p style="margin:4px 0 0; font-size:0.85rem; color:var(--muted,#666);">Contribute at least <strong>${companyMatch.capPercent}%</strong> to receive the full employer match.</p>` +
      '</div>';
  });

  /* ── Wire: COL ── */
  document.getElementById('col-compare-btn').addEventListener('click', runColCalc);
};

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', setupCareerTools);
} else {
  setupCareerTools();
}