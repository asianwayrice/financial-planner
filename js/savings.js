/* savings.js — Compound Interest Growth Chart + Goal Calculator + Sinking Funds */

(function () {

    /* ── Helpers ──────────────────────────────────────────────────── */

    const fmt = v => '$' + Math.round(v).toLocaleString('en-US');

    const fmtFull = v => v.toLocaleString('en-US', {
        style: 'currency', currency: 'USD', maximumFractionDigits: 0
    });

    const getCompletionDate = months => {
        const d = new Date();
        d.setMonth(d.getMonth() + months);
        return (d.getMonth() + 1).toString().padStart(2, '0') + '/' + d.getFullYear();
    };

    /* ── Core compound-interest calculation ──────────────────────── */
    const buildYearlyData = (principal, monthly, annualRate, years, n) => {
        const r = annualRate / 100;
        const ratePerPeriod = r / n;
        const periodsPerMonth = n / 12;

        const labels     = [];
        const balances   = [];
        const contributed = [];

        let balance        = principal;
        let totalContrib   = principal;

        for (let yr = 0; yr <= years; yr++) {
            labels.push('Year ' + yr);
            balances.push(Math.round(balance));
            contributed.push(Math.round(totalContrib));

            if (yr < years) {
                for (let m = 0; m < 12; m++) {
                    balance = balance * Math.pow(1 + ratePerPeriod, periodsPerMonth) + monthly;
                    totalContrib += monthly;
                }
            }
        }
        return { labels, balances, contributed };
    };

    /* ── Months-to-goal ──────────────────────────────────────────── */
    const monthsToGoal = (principal, monthly, annualRate, goal, n) => {
        if (goal <= 0) return null;
        if (principal >= goal) return 0;
        const r = annualRate / 100;
        const ratePerPeriod   = r / n;
        const periodsPerMonth = n / 12;
        let balance = principal;
        let months  = 0;
        while (balance < goal && months < 1200) {
            balance = balance * Math.pow(1 + ratePerPeriod, periodsPerMonth) + monthly;
            months++;
        }
        return balance >= goal ? months : null;
    };

    /* ── Sinking Funds State ─────────────────────────────────────── */
    let sinkingFunds = [];
    let sfNextId = 1;

    const FUND_EMOJIS = ['🎯','✈️','🚗','🏠','💍','🎓','🐾','🎮','⛵','🌴','💻','🏋️'];

    const renderSinkingFunds = () => {
        const list = document.getElementById('sf-list');
        const summary = document.getElementById('sf-summary');
        if (!list) return;

        if (sinkingFunds.length === 0) {
            list.innerHTML = '<p class="sf-empty">No buckets yet. Add one above to get started!</p>';
            summary.style.display = 'none';
            return;
        }

        const totalGoal  = sinkingFunds.reduce((s, f) => s + f.goal, 0);
        const totalSaved = sinkingFunds.reduce((s, f) => s + f.saved, 0);
        const totalPct   = totalGoal > 0 ? Math.min(100, (totalSaved / totalGoal) * 100) : 0;

        summary.style.display = '';
        document.getElementById('sf-total-goal').textContent  = fmtFull(totalGoal);
        document.getElementById('sf-total-saved').textContent = fmtFull(totalSaved);
        document.getElementById('sf-total-left').textContent  = fmtFull(Math.max(0, totalGoal - totalSaved));
        document.getElementById('sf-total-bar').style.width   = totalPct.toFixed(1) + '%';
        document.getElementById('sf-total-pct').textContent   = totalPct.toFixed(0) + '%';

        list.innerHTML = sinkingFunds.map(fund => {
            const pct      = fund.goal > 0 ? Math.min(100, (fund.saved / fund.goal) * 100) : 0;
            const left     = Math.max(0, fund.goal - fund.saved);
            const done     = fund.saved >= fund.goal;
            const monthsLeft = fund.monthly > 0 && !done
                ? Math.ceil(left / fund.monthly)
                : null;

            return `
<div class="sf-card" data-id="${fund.id}">
    <div class="sf-card-header">
        <span class="sf-emoji">${fund.emoji}</span>
        <span class="sf-name">${fund.name}</span>
        <button class="sf-delete" data-id="${fund.id}" title="Remove bucket">✕</button>
    </div>

    <div class="sf-amounts">
        <div class="sf-amount-block">
            <span class="sf-amount-label">Saved</span>
            <span class="sf-amount-value sf-saved-val">${fmtFull(fund.saved)}</span>
        </div>
        <div class="sf-amount-block">
            <span class="sf-amount-label">Goal</span>
            <span class="sf-amount-value">${fmtFull(fund.goal)}</span>
        </div>
        <div class="sf-amount-block">
            <span class="sf-amount-label">Remaining</span>
            <span class="sf-amount-value">${done ? '✅ Done!' : fmtFull(left)}</span>
        </div>
    </div>

    <div class="sf-bar-wrap">
        <div class="sf-bar-track">
            <div class="sf-bar-fill ${done ? 'sf-bar-done' : ''}" style="width:${pct.toFixed(1)}%"></div>
        </div>
        <span class="sf-pct">${pct.toFixed(0)}%</span>
    </div>

    ${fund.monthly > 0 && !done && monthsLeft !== null
        ? `<p class="sf-eta">📅 At ${fmtFull(fund.monthly)}/mo — done ${getCompletionDate(monthsLeft)} (${monthsLeft} mo)</p>`
        : ''}

    <div class="sf-deposit-row">
        <input class="sf-deposit-input" type="number" min="0" step="10"
               placeholder="Add amount ($)" data-id="${fund.id}" />
        <button class="sf-deposit-btn" data-id="${fund.id}">+ Add</button>
    </div>
</div>`;
        }).join('');

        /* Deposit buttons */
        list.querySelectorAll('.sf-deposit-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const id     = parseInt(btn.dataset.id);
                const input  = list.querySelector(`.sf-deposit-input[data-id="${id}"]`);
                const amount = parseFloat(input.value) || 0;
                if (amount <= 0) return;
                const fund = sinkingFunds.find(f => f.id === id);
                if (fund) { fund.saved = Math.min(fund.goal, fund.saved + amount); }
                input.value = '';
                renderSinkingFunds();
            });
        });

        /* Delete buttons */
        list.querySelectorAll('.sf-delete').forEach(btn => {
            btn.addEventListener('click', () => {
                const id = parseInt(btn.dataset.id);
                sinkingFunds = sinkingFunds.filter(f => f.id !== id);
                renderSinkingFunds();
            });
        });
    };

    /* ── DOM injection ───────────────────────────────────────────── */
    const setup = () => {
        const container = document.getElementById('savings-container');
        if (!container) return;

        container.innerHTML = `
<div class="sv-wrap">

    <div class="sv-inputs">
        <div class="sv-field">
            <label for="sv-principal">Starting balance ($)</label>
            <input type="number" id="sv-principal" min="0" step="100" value="1000" placeholder="e.g. 1000" />
        </div>
        <div class="sv-field">
            <label for="sv-monthly">Monthly contribution ($)</label>
            <input type="number" id="sv-monthly" min="0" step="50" value="500" placeholder="e.g. 500" />
        </div>
        <div class="sv-field">
            <label for="sv-rate">Annual interest rate (%)</label>
            <input type="number" id="sv-rate" min="0" max="30" step="0.1" value="5" placeholder="e.g. 5" />
        </div>
        <div class="sv-field">
            <label for="sv-years">Time horizon (years)</label>
            <input type="number" id="sv-years" min="1" max="50" step="1" value="10" placeholder="e.g. 10" />
        </div>
        <div class="sv-field">
            <label for="sv-compound">Compounding frequency</label>
            <select id="sv-compound">
                <option value="12" selected>Monthly</option>
                <option value="4">Quarterly</option>
                <option value="2">Semi-annually</option>
                <option value="1">Annually</option>
                <option value="365">Daily</option>
            </select>
        </div>
        <div class="sv-field sv-field--full">
            <label for="sv-goal">Savings goal — optional ($)</label>
            <input type="number" id="sv-goal" min="0" step="1000" placeholder="e.g. 100000" />
        </div>
    </div>

    <div class="sv-stats">
        <div class="sv-stat">
            <span class="sv-stat__label">Final Balance</span>
            <span class="sv-stat__value" id="sv-final">—</span>
        </div>
        <div class="sv-stat">
            <span class="sv-stat__label">Total Contributed</span>
            <span class="sv-stat__value" id="sv-contributed">—</span>
        </div>
        <div class="sv-stat sv-stat--accent">
            <span class="sv-stat__label">Interest Earned</span>
            <span class="sv-stat__value" id="sv-interest">—</span>
        </div>
        <div class="sv-stat sv-stat--goal" id="sv-goal-card" style="display:none;">
            <span class="sv-stat__label">Goal Reached</span>
            <span class="sv-stat__value" id="sv-goal-date">—</span>
        </div>
    </div>

    <div class="sv-chart-box">
        <div class="sv-legend">
            <span class="sv-legend-dot" style="background:#004d2c;"></span><span>Total balance</span>
            <span class="sv-legend-dot sv-legend-dot--dashed"></span><span>Amount contributed</span>
        </div>
        <div style="position:relative; width:100%; height:320px;">
            <canvas id="sv-chart" role="img" aria-label="Savings growth over time chart">
                Compound interest savings growth chart.
            </canvas>
        </div>
        <p id="sv-goal-note" style="display:none; margin:10px 0 0; font-size:0.88rem;
           font-weight:600; color:#2563eb;"></p>
    </div>

</div>

<!-- ══════════════════════════════════════════════════════════
     SINKING FUNDS
     ══════════════════════════════════════════════════════════ -->
<div class="sf-wrap">

    <div class="sf-header">
        <div>
            <h3 class="sf-title">🪣 Sinking Funds</h3>
            <p class="sf-subtitle">Set aside money for specific goals. Track progress bucket by bucket.</p>
        </div>
    </div>

    <!-- Add bucket form -->
    <div class="sf-form-box">
        <div class="sf-form-grid">
            <div class="sf-form-field">
                <label class="sf-label">Bucket name</label>
                <input id="sf-new-name" class="sf-input" type="text" placeholder="e.g. New Car, Vacation" maxlength="40" />
            </div>
            <div class="sf-form-field">
                <label class="sf-label">Goal amount ($)</label>
                <input id="sf-new-goal" class="sf-input" type="number" min="1" step="100" placeholder="e.g. 5000" />
            </div>
            <div class="sf-form-field">
                <label class="sf-label">Already saved ($)</label>
                <input id="sf-new-saved" class="sf-input" type="number" min="0" step="10" placeholder="e.g. 500" />
            </div>
            <div class="sf-form-field">
                <label class="sf-label">Monthly contribution ($)</label>
                <input id="sf-new-monthly" class="sf-input" type="number" min="0" step="10" placeholder="e.g. 200" />
            </div>
            <div class="sf-form-field">
                <label class="sf-label">Icon</label>
                <select id="sf-new-emoji" class="sf-input">
                    ${FUND_EMOJIS.map(e => `<option value="${e}">${e}</option>`).join('')}
                </select>
            </div>
        </div>
        <button id="sf-add-btn" class="sf-add-btn">+ Add Bucket</button>
        <p id="sf-error" class="sf-error" style="display:none;">Please enter a name and a goal amount greater than zero.</p>
    </div>

    <!-- Summary bar -->
    <div id="sf-summary" class="sf-summary" style="display:none;">
        <div class="sf-summary-stats">
            <div class="sf-summary-stat">
                <span class="sf-summary-label">Total Goal</span>
                <span class="sf-summary-value" id="sf-total-goal">—</span>
            </div>
            <div class="sf-summary-stat">
                <span class="sf-summary-label">Total Saved</span>
                <span class="sf-summary-value sf-saved-val" id="sf-total-saved">—</span>
            </div>
            <div class="sf-summary-stat">
                <span class="sf-summary-label">Still Needed</span>
                <span class="sf-summary-value" id="sf-total-left">—</span>
            </div>
        </div>
        <div class="sf-bar-wrap" style="margin-top:10px;">
            <div class="sf-bar-track">
                <div class="sf-bar-fill" id="sf-total-bar" style="width:0%"></div>
            </div>
            <span class="sf-pct" id="sf-total-pct">0%</span>
        </div>
    </div>

    <!-- Bucket cards -->
    <div id="sf-list" class="sf-list"></div>

</div>

<style>
/* ══════════════════════════════════
   SAVINGS CALCULATOR (existing)
══════════════════════════════════ */
.sv-wrap { display:grid; gap:20px; }

.sv-inputs {
    display:grid;
    grid-template-columns:repeat(auto-fit, minmax(170px,1fr));
    gap:14px;
    background:var(--surface-soft,#f8faf8);
    border:1px solid var(--border,#d7e8df);
    border-radius:12px;
    padding:18px;
}

.sv-field { display:flex; flex-direction:column; gap:5px; }
.sv-field--full { grid-column:1/-1; max-width:280px; }

.sv-field label {
    font-size:0.78rem; font-weight:700;
    color:var(--muted,#555);
    text-transform:uppercase; letter-spacing:0.04em;
}

.sv-field input,
.sv-field select {
    padding:9px 11px;
    border:1px solid var(--border,#b3d7c5);
    border-radius:8px;
    font-size:0.95rem;
    background:var(--surface,#fff);
    color:var(--text,#333);
    width:100%; box-sizing:border-box; margin:0;
    transition:border-color 0.2s;
}
.sv-field input:focus,
.sv-field select:focus { outline:none; border-color:#004d2c; }

.sv-stats {
    display:grid;
    grid-template-columns:repeat(auto-fit,minmax(150px,1fr));
    gap:12px;
}
.sv-stat {
    background:var(--surface,#fff);
    border:1px solid var(--border,#d7e8df);
    border-radius:12px;
    padding:14px 16px;
    display:flex; flex-direction:column; gap:4px;
}
.sv-stat--accent { border-left:4px solid #004d2c; }
.sv-stat--goal   { border-left:4px solid #2563eb; }

.sv-stat__label {
    font-size:0.76rem; font-weight:700;
    text-transform:uppercase; letter-spacing:0.05em;
    color:var(--muted,#666);
}
.sv-stat__value { font-size:1.3rem; font-weight:700; color:var(--text,#333); }
.sv-stat--accent .sv-stat__value { color:#004d2c; }
.sv-stat--goal   .sv-stat__value { color:#2563eb; }

.sv-chart-box {
    background:var(--surface,#fff);
    border:1px solid var(--border,#d7e8df);
    border-radius:12px;
    padding:18px 20px 14px;
}

.sv-legend {
    display:flex; align-items:center; flex-wrap:wrap;
    gap:6px; font-size:0.83rem;
    color:var(--muted,#555); margin-bottom:12px;
}
.sv-legend-dot {
    width:11px; height:11px; border-radius:3px; flex-shrink:0;
}
.sv-legend-dot--dashed {
    background:transparent;
    border:2px dashed #b3d7c5;
    border-radius:3px;
}

/* ══════════════════════════════════
   SINKING FUNDS
══════════════════════════════════ */
.sf-wrap {
    display:grid;
    gap:18px;
    margin-top:28px;
    padding-top:28px;
    border-top:2px solid var(--border,#d7e8df);
}

.sf-header { display:flex; align-items:flex-start; justify-content:space-between; flex-wrap:wrap; gap:10px; }

.sf-title {
    font-size:1.15rem; font-weight:700;
    color:var(--text,#333);
    margin:0 0 4px;
}
.sf-subtitle {
    font-size:0.88rem;
    color:var(--muted,#666);
    margin:0;
}

/* Form */
.sf-form-box {
    background:var(--surface-soft,#f8faf8);
    border:1px solid var(--border,#d7e8df);
    border-radius:14px;
    padding:18px;
    display:grid;
    gap:14px;
}

.sf-form-grid {
    display:grid;
    grid-template-columns:repeat(auto-fit, minmax(160px,1fr));
    gap:12px;
}

.sf-form-field { display:flex; flex-direction:column; gap:5px; }

.sf-label {
    font-size:0.76rem; font-weight:700;
    text-transform:uppercase; letter-spacing:0.04em;
    color:var(--muted,#555);
}

.sf-input {
    padding:9px 11px;
    border:1px solid var(--border,#b3d7c5);
    border-radius:10px;
    font-size:0.93rem;
    background:var(--surface,#fff);
    color:var(--text,#333);
    width:100%; box-sizing:border-box; margin:0;
    transition:border-color 0.2s;
}
.sf-input:focus { outline:none; border-color:#004d2c; }

.sf-add-btn {
    padding:10px 22px;
    background:#004d2c;
    color:#fff;
    border:none;
    border-radius:10px;
    font-weight:700;
    font-size:0.93rem;
    cursor:pointer;
    width:fit-content;
    transition:filter 0.2s;
}
.sf-add-btn:hover { filter:brightness(1.1); }

.sf-error { color:#b71c1c; font-size:0.85rem; margin:0; }

/* Summary */
.sf-summary {
    background:var(--surface,#fff);
    border:1px solid var(--border,#d7e8df);
    border-radius:14px;
    padding:16px 18px;
}

.sf-summary-stats {
    display:grid;
    grid-template-columns:repeat(auto-fit,minmax(130px,1fr));
    gap:10px;
    margin-bottom:4px;
}
.sf-summary-label {
    font-size:0.74rem; font-weight:700;
    text-transform:uppercase; letter-spacing:0.05em;
    color:var(--muted,#666);
    display:block; margin-bottom:2px;
}
.sf-summary-value {
    font-size:1.1rem; font-weight:700;
    color:var(--text,#333);
}

/* Progress bar shared */
.sf-bar-wrap { display:flex; align-items:center; gap:10px; }
.sf-bar-track {
    flex:1; height:10px;
    background:var(--surface-soft,#e8f0ea);
    border-radius:99px;
    overflow:hidden;
}
.sf-bar-fill {
    height:100%;
    background:linear-gradient(90deg,#004d2c,#2da05a);
    border-radius:99px;
    transition:width 0.5s ease;
    min-width:2px;
}
.sf-bar-done { background:linear-gradient(90deg,#059669,#34d399); }
.sf-pct {
    font-size:0.8rem; font-weight:700;
    color:var(--muted,#555);
    min-width:34px; text-align:right;
}

/* Bucket cards grid */
.sf-list {
    display:grid;
    grid-template-columns:repeat(auto-fill, minmax(260px,1fr));
    gap:14px;
}

.sf-empty {
    color:var(--muted,#888);
    font-size:0.9rem;
    margin:0;
    grid-column:1/-1;
}

.sf-card {
    background:var(--surface,#fff);
    border:1px solid var(--border,#d7e8df);
    border-radius:14px;
    padding:16px;
    display:flex;
    flex-direction:column;
    gap:12px;
    transition:box-shadow 0.2s;
}
.sf-card:hover { box-shadow:0 4px 16px rgba(0,0,0,0.08); }

.sf-card-header {
    display:flex;
    align-items:center;
    gap:8px;
}
.sf-emoji { font-size:1.4rem; flex-shrink:0; }
.sf-name  { font-weight:700; font-size:1rem; color:var(--text,#333); flex:1; word-break:break-word; }

.sf-delete {
    background:none; border:none;
    color:var(--muted,#aaa);
    cursor:pointer; font-size:0.85rem;
    padding:2px 6px; border-radius:6px;
    transition:color 0.15s, background 0.15s;
    flex-shrink:0;
}
.sf-delete:hover { color:#b71c1c; background:rgba(183,28,28,0.08); }

.sf-amounts {
    display:grid;
    grid-template-columns:repeat(3,1fr);
    gap:6px;
    text-align:center;
}
.sf-amount-label {
    font-size:0.7rem; font-weight:700;
    text-transform:uppercase; letter-spacing:0.04em;
    color:var(--muted,#888);
    display:block; margin-bottom:2px;
}
.sf-amount-value {
    font-size:0.92rem; font-weight:700;
    color:var(--text,#333);
}
.sf-saved-val { color:#004d2c; }

.sf-eta {
    font-size:0.8rem;
    color:var(--muted,#666);
    margin:0;
    background:var(--surface-soft,#f4f9f6);
    border-radius:8px;
    padding:6px 10px;
}

/* Deposit row */
.sf-deposit-row { display:flex; gap:8px; }
.sf-deposit-input {
    flex:1;
    padding:8px 10px;
    border:1px solid var(--border,#b3d7c5);
    border-radius:10px;
    font-size:0.88rem;
    background:var(--surface,#fff);
    color:var(--text,#333);
    min-width:0;
    box-sizing:border-box;
    margin:0;
}
.sf-deposit-input:focus { outline:none; border-color:#004d2c; }
.sf-deposit-btn {
    padding:8px 14px;
    background:#004d2c;
    color:#fff;
    border:none;
    border-radius:10px;
    font-weight:700;
    font-size:0.85rem;
    cursor:pointer;
    white-space:nowrap;
    transition:filter 0.2s;
}
.sf-deposit-btn:hover { filter:brightness(1.12); }

/* ── Dark mode ── */
body.dark-mode .sv-inputs,
body.dark-mode .sv-stat,
body.dark-mode .sv-chart-box {
    background-color:#111826 !important;
    border-color:#334155 !important;
}
body.dark-mode .sv-field input,
body.dark-mode .sv-field select {
    background-color:#0f1720 !important;
    color:#e5e7eb !important;
    border-color:#334155 !important;
}
body.dark-mode .sv-field input::placeholder { color:#94a3b8 !important; }
body.dark-mode .sv-field label,
body.dark-mode .sv-stat__label,
body.dark-mode .sv-legend { color:#94a3b8 !important; }
body.dark-mode .sv-stat__value           { color:#e5e7eb !important; }
body.dark-mode .sv-stat--accent .sv-stat__value { color:#6ee7b7 !important; }
body.dark-mode .sv-stat--goal   .sv-stat__value { color:#93c5fd !important; }
body.dark-mode #sv-goal-note             { color:#93c5fd !important; }
body.dark-mode .sv-legend-dot--dashed    { border-color:#4a7a62 !important; }

/* Sinking Funds dark mode */
body.dark-mode .sf-wrap { border-top-color:#334155 !important; }

body.dark-mode .sf-title  { color:#e5e7eb !important; }
body.dark-mode .sf-subtitle,
body.dark-mode .sf-label,
body.dark-mode .sf-amount-label,
body.dark-mode .sf-summary-label,
body.dark-mode .sf-pct,
body.dark-mode .sf-eta,
body.dark-mode .sf-empty  { color:#94a3b8 !important; }

body.dark-mode .sf-form-box,
body.dark-mode .sf-summary {
    background-color:#111826 !important;
    border-color:#334155 !important;
}

body.dark-mode .sf-input,
body.dark-mode .sf-deposit-input {
    background-color:#0f1720 !important;
    color:#e5e7eb !important;
    border-color:#334155 !important;
}
body.dark-mode .sf-input::placeholder,
body.dark-mode .sf-deposit-input::placeholder { color:#94a3b8 !important; }

body.dark-mode .sf-card {
    background-color:#111826 !important;
    border-color:#334155 !important;
}
body.dark-mode .sf-card:hover { box-shadow:0 4px 18px rgba(0,0,0,0.35) !important; }

body.dark-mode .sf-name,
body.dark-mode .sf-amount-value,
body.dark-mode .sf-summary-value { color:#e5e7eb !important; }

body.dark-mode .sf-saved-val { color:#6ee7b7 !important; }

body.dark-mode .sf-bar-track { background:#1e2d3d !important; }

body.dark-mode .sf-eta { background:#0f1720 !important; }

body.dark-mode .sf-delete { color:#64748b !important; }
body.dark-mode .sf-delete:hover { color:#f87171 !important; background:rgba(248,113,113,0.1) !important; }

body.dark-mode .sf-add-btn,
body.dark-mode .sf-deposit-btn {
    background-color:#0f766e !important;
}
</style>
        `;

        /* ── Sinking Funds: Add bucket ── */
        document.getElementById('sf-add-btn').addEventListener('click', () => {
            const name    = document.getElementById('sf-new-name').value.trim();
            const goal    = parseFloat(document.getElementById('sf-new-goal').value) || 0;
            const saved   = Math.min(parseFloat(document.getElementById('sf-new-saved').value) || 0, goal);
            const monthly = parseFloat(document.getElementById('sf-new-monthly').value) || 0;
            const emoji   = document.getElementById('sf-new-emoji').value;
            const err     = document.getElementById('sf-error');

            if (!name || goal <= 0) {
                err.style.display = '';
                return;
            }
            err.style.display = 'none';

            sinkingFunds.push({ id: sfNextId++, name, goal, saved, monthly, emoji });

            /* reset form */
            document.getElementById('sf-new-name').value    = '';
            document.getElementById('sf-new-goal').value    = '';
            document.getElementById('sf-new-saved').value   = '';
            document.getElementById('sf-new-monthly').value = '';

            renderSinkingFunds();
        });

        renderSinkingFunds();

        loadChartJS(initChart);
    };

    /* ── Load Chart.js once (safe if charts.js already loaded it) ── */
    const loadChartJS = cb => {
        if (window.Chart) { cb(); return; }
        const s = document.createElement('script');
        s.src = 'https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.js';
        s.onload = cb;
        document.head.appendChild(s);
    };

    /* ── Chart + live wiring ─────────────────────────────────────── */
    let chartInstance = null;

    const initChart = () => {
        const ids = ['sv-principal','sv-monthly','sv-rate','sv-years','sv-compound','sv-goal'];
        if (ids.some(id => !document.getElementById(id))) return;

        const render = () => {
            const principal = Math.max(0, parseFloat(document.getElementById('sv-principal').value) || 0);
            const monthly   = Math.max(0, parseFloat(document.getElementById('sv-monthly').value)   || 0);
            const rate      = Math.max(0, parseFloat(document.getElementById('sv-rate').value)      || 0);
            const years     = Math.min(50, Math.max(1, parseInt(document.getElementById('sv-years').value) || 10));
            const n         = parseInt(document.getElementById('sv-compound').value) || 12;
            const goal      = Math.max(0, parseFloat(document.getElementById('sv-goal').value) || 0);

            const { labels, balances, contributed } = buildYearlyData(principal, monthly, rate, years, n);

            const finalBal     = balances[balances.length - 1];
            const totalContrib = contributed[contributed.length - 1];
            const interest     = Math.max(0, finalBal - totalContrib);

            document.getElementById('sv-final').textContent       = fmtFull(finalBal);
            document.getElementById('sv-contributed').textContent = fmtFull(totalContrib);
            document.getElementById('sv-interest').textContent    = fmtFull(interest);

            /* Goal card */
            const goalCard = document.getElementById('sv-goal-card');
            const goalNote = document.getElementById('sv-goal-note');
            if (goal > 0) {
                goalCard.style.display = '';
                const months = monthsToGoal(principal, monthly, rate, goal, n);
                if (months === 0) {
                    document.getElementById('sv-goal-date').textContent = 'Already reached!';
                    goalNote.style.display = 'none';
                } else if (months !== null) {
                    const yrs = (months / 12).toFixed(1);
                    document.getElementById('sv-goal-date').textContent = getCompletionDate(months);
                    goalNote.textContent = `\uD83C\uDFAF Goal of ${fmtFull(goal)} reached in ${yrs} years (${getCompletionDate(months)})`;
                    goalNote.style.display = '';
                } else {
                    document.getElementById('sv-goal-date').textContent = 'Beyond horizon';
                    goalNote.style.display = 'none';
                }
            } else {
                goalCard.style.display = 'none';
                goalNote.style.display = 'none';
            }

            /* Theme-aware colours */
            const dk             = document.body.classList.contains('dark-mode');
            const balColor       = dk ? '#34d399' : '#004d2c';
            const balFill        = dk ? 'rgba(52,211,153,0.10)' : 'rgba(0,77,44,0.08)';
            const contribColor   = dk ? '#4a7a62' : '#b3d7c5';
            const gridColor      = dk ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.06)';
            const tickColor      = dk ? '#94a3b8' : '#888';
            const tooltipBg      = dk ? '#1e293b' : '#ffffff';
            const tooltipText    = dk ? '#e5e7eb' : '#1f2937';
            const tooltipBorder  = dk ? '#334155' : '#d7e8df';
            const goalLineColor  = dk ? '#93c5fd' : '#2563eb';

            const goalLinePlugin = {
                id: 'svGoalLine',
                afterDraw(chart) {
                    if (!goal) return;
                    const { ctx: c, scales: { x, y } } = chart;
                    if (goal > y.max) return;
                    const yPx = y.getPixelForValue(goal);
                    c.save();
                    c.setLineDash([6, 4]);
                    c.strokeStyle  = goalLineColor;
                    c.lineWidth    = 1.5;
                    c.beginPath();
                    c.moveTo(x.left, yPx);
                    c.lineTo(x.right, yPx);
                    c.stroke();
                    c.setLineDash([]);
                    c.font      = '500 11px Segoe UI, system-ui, sans-serif';
                    c.fillStyle = goalLineColor;
                    c.fillText('Goal ' + fmt(goal), x.right - 108, yPx - 5);
                    c.restore();
                }
            };

            const canvas = document.getElementById('sv-chart');
            if (!canvas) return;

            if (chartInstance) { chartInstance.destroy(); chartInstance = null; }

            chartInstance = new Chart(canvas, {
                type: 'line',
                data: {
                    labels,
                    datasets: [
                        {
                            label: 'Total balance',
                            data: balances,
                            borderColor: balColor,
                            backgroundColor: balFill,
                            borderWidth: 2.5,
                            pointRadius: 3,
                            pointHoverRadius: 6,
                            pointBackgroundColor: balColor,
                            fill: true,
                            tension: 0.4
                        },
                        {
                            label: 'Amount contributed',
                            data: contributed,
                            borderColor: contribColor,
                            backgroundColor: 'transparent',
                            borderWidth: 2,
                            borderDash: [5, 4],
                            pointRadius: 0,
                            pointHoverRadius: 5,
                            fill: false,
                            tension: 0.4
                        }
                    ]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    interaction: { mode: 'index', intersect: false },
                    plugins: {
                        legend: { display: false },
                        tooltip: {
                            backgroundColor: tooltipBg,
                            titleColor: tooltipText,
                            bodyColor: tickColor,
                            borderColor: tooltipBorder,
                            borderWidth: 1,
                            padding: 12,
                            callbacks: {
                                label: ctx => '  ' + ctx.dataset.label + ':  ' + fmt(ctx.parsed.y)
                            }
                        }
                    },
                    scales: {
                        x: {
                            grid: { color: gridColor },
                            ticks: {
                                color: tickColor, font: { size: 11 },
                                maxRotation: 0, autoSkip: true, maxTicksLimit: 11
                            }
                        },
                        y: {
                            grid: { color: gridColor },
                            ticks: {
                                color: tickColor, font: { size: 11 },
                                callback: v => fmt(v)
                            },
                            beginAtZero: true
                        }
                    }
                },
                plugins: [goalLinePlugin]
            });
        };

        ids.forEach(id => {
            const el = document.getElementById(id);
            if (el) el.addEventListener('input', render);
        });

        window.addEventListener('theme-change', () => { if (chartInstance) render(); });

        render();
    };

    /* ── Boot ─────────────────────────────────────────────────────── */
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', setup);
    } else {
        setup();
    }

})();