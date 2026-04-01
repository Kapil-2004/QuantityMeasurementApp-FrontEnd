/**
 * QuantiMeasure — Dashboard Application Logic
 * Why Class-based? Dashboard is complex; a class-based approach 
 * ensures that state (active type, action, result) is cleanly encapsulated.
 */

'use strict';

/* 
   Unit lookup objects:
   Why? Centralizing units and labels makes it trivial to 
   add new measurement types (e.g., Area, Power) later.
*/
const UNITS = {
  Length:      ['Feet', 'Inch', 'Yard', 'Centimeter'],
  Weight:      ['Kilogram', 'Gram', 'Pound'],
  Temperature: ['Celsius', 'Fahrenheit', 'Kelvin'],
  Volume:      ['Litre', 'Millilitre', 'Gallon'],
};

const UNIT_LABELS = {
  Feet: 'ft', Inch: 'in', Yard: 'yd', Centimeter: 'cm',
  Kilogram: 'kg', Gram: 'g', Pound: 'lb',
  Celsius: '°C', Fahrenheit: '°F', Kelvin: 'K',
  Litre: 'L', Millilitre: 'mL', Gallon: 'gal',
};

const TYPE_ICONS = {
  Length: '📏', Weight: '⚖️', Temperature: '🌡️', Volume: '🧪',
};

const ACTION_SYMBOLS = {
  add: '+', subtract: '−', divide: '÷', compare: '⇄', convert: '→',
};

// Temperature only supports compare & convert
const TEMP_ONLY = new Set(['compare', 'convert']);

/* 
   HistoryManager: Client-side cache for recent runs.
   Why? This provides "instant" local feedback while 
   waiting for the permanent history to sync with our database.
*/
class HistoryManager {
  #items = [];
  #maxItems = 50;

  push(entry) {
    this.#items.unshift({ ...entry, id: Date.now() });
    if (this.#items.length > this.#maxItems) this.#items.pop();
  }

  getAll() { return [...this.#items]; }
  clear()  { this.#items = []; }
  get length() { return this.#items.length; }
}

/* 
   FormBuilder: A declarative way to generate UI.
   Why? Instead of hardcoding 20 HTML variations, we 
   generate the specific fields required for the active action.
*/
class FormBuilder {
  /**
   * Build select <option> tags from unit array
   * @param {string[]} units
   * @param {string}   selected
   */
  static buildOptions(units, selected = units[0]) {
    return units
      .map(u => `<option value="${u}" ${u === selected ? 'selected' : ''}>${u}</option>`)
      .join('');
  }

  /** Single quantity field group (value + unit selects) */
  static quantityGroup(idPrefix, label, units, defaultUnit = units[0]) {
    return `
      <div class="field-group">
        <div class="dash-label">${label}</div>
        <input
          type="number"
          id="${idPrefix}-val"
          class="dash-input"
          value="1"
          step="any"
          required
          aria-label="${label} value"
        />
        <select id="${idPrefix}-unit" class="dash-select" aria-label="${label} unit">
          ${this.buildOptions(units, defaultUnit)}
        </select>
      </div>`;
  }

  /**
   * Render binary form (compare, add, subtract, divide)
   */
  static binary(action, units) {
    const sym = ACTION_SYMBOLS[action] ?? '?';
    return `
      <div class="form-row three-col" style="margin-bottom:1rem;">
        ${this.quantityGroup('q1', 'FROM', units)}
        <div class="op-symbol" aria-hidden="true">${sym}</div>
        ${this.quantityGroup('q2', 'TO', units, units[1] ?? units[0])}
      </div>`;
  }

  /**
   * Render convert form (single input + target unit)
   */
  static convert(units) {
    return `
      <div style="margin-bottom:1rem;">
        ${this.quantityGroup('q1', 'FROM', units)}
        <div class="convert-arrow" aria-hidden="true">↓ Convert To</div>
        <div class="field-group">
          <div class="dash-label">TARGET UNIT</div>
          <select id="q2-unit" class="dash-select" aria-label="Target unit">
            ${this.buildOptions(units, units[1] ?? units[0])}
          </select>
        </div>
      </div>`;
  }
}

/* ═══════════════════════════════════════════════
   RESULT RENDERER — updates result card
═══════════════════════════════════════════════ */
class ResultRenderer {
  #card;
  #label;
  #value;
  #unit;

  constructor() {
    this.#card  = document.getElementById('result-card');
    this.#label = document.getElementById('result-label');
    this.#value = document.getElementById('result-value');
    this.#unit  = document.getElementById('result-unit');
  }

  show({ label, value, unit, type = 'primary' }) {
    if (!this.#card) return;
    this.#card.className = `result-card show ${type}`;
    if (this.#label) this.#label.textContent = label;
    if (this.#value) this.#value.textContent = value;
    if (this.#unit)  this.#unit.textContent  = unit ?? '';
  }

  error(message) {
    this.show({ label: 'Error', value: message, unit: '', type: 'error' });
  }

  hide() {
    this.#card?.classList.remove('show');
  }
}

/* ═══════════════════════════════════════════════
   HISTORY RENDERER — builds history list DOM
═══════════════════════════════════════════════ */
class HistoryRenderer {
  #scroll;
  #empty;
  #count;

  constructor() {
    this.#scroll = document.getElementById('history-scroll');
    this.#empty  = document.getElementById('history-empty');
    this.#count  = document.getElementById('history-count');
  }

  /** Render the local history array */
  renderLocal(items) {
    if (!this.#scroll) return;

    // Remove old items except the empty placeholder
    const old = this.#scroll.querySelectorAll('.history-item');
    old.forEach(el => el.remove());

    if (items.length === 0) {
      this.#empty?.classList.remove('hidden');
      if (this.#count) this.#count.textContent = '0';
      return;
    }

    this.#empty?.classList.add('hidden');
    if (this.#count) this.#count.textContent = items.length;

    const fragment = document.createDocumentFragment();
    items.forEach(item => {
      fragment.appendChild(this._buildItem(item));
    });
    this.#scroll.prepend(fragment);
  }

  /** Render items from the backend /history endpoint */
  renderRemote(items) {
    if (!this.#scroll) return;
    const old = this.#scroll.querySelectorAll('.history-item');
    old.forEach(el => el.remove());

    if (!items || items.length === 0) {
      this.#empty?.classList.remove('hidden');
      if (this.#count) this.#count.textContent = '0';
      return;
    }

    this.#empty?.classList.add('hidden');
    if (this.#count) this.#count.textContent = items.length;

    const fragment = document.createDocumentFragment();
    // Show newest first (slice for perf)
    [...items].reverse().slice(0, 30).forEach(item => {
      fragment.appendChild(this._buildRemoteItem(item));
    });
    this.#scroll.prepend(fragment);
  }

  _buildItem({ action, type, result, q1, q2, targetUnit, timestamp }) {
    const el   = document.createElement('div');
    el.className = 'history-item';
    el.setAttribute('role', 'listitem');

    const time  = timestamp ? new Date(timestamp).toLocaleTimeString() : '';
    const badge = `<span class="history-op-badge ${action}">${action}</span>`;
    let desc = '', res = '';

    // Build description conditionally
    if (action === 'convert') {
      desc = `${q1?.Value} ${q1?.Unit} → ${targetUnit}`;
      res  = typeof result?.result === 'number'
        ? `= ${this._fmt(result.result)} ${UNIT_LABELS[result.unit] ?? result.unit ?? ''}`
        : '';
    } else if (action === 'compare') {
      desc = `${q1?.Value} ${q1?.Unit} vs ${q2?.Value} ${q2?.Unit}`;
      res  = result?.areEqual !== undefined
        ? (result.areEqual ? '✅ Equal' : '❌ Not Equal')
        : '';
    } else {
      desc = `${q1?.Value} ${q1?.Unit} ${ACTION_SYMBOLS[action]} ${q2?.Value} ${q2?.Unit}`;
      res  = typeof result?.result === 'number'
        ? `= ${this._fmt(result.result)} ${UNIT_LABELS[result.unit] ?? result.unit ?? ''}`
        : (typeof result === 'number' ? `= ${this._fmt(result)}` : '');
    }

    el.innerHTML = `
      <div class="history-item-top">
        ${badge}
        <span class="history-time">${time}</span>
      </div>
      <div class="history-desc">${type ? `<b>${TYPE_ICONS[type] ?? ''} ${type}</b> · ` : ''}${desc}</div>
      ${res ? `<div class="history-result">${res}</div>` : ''}`;
    return el;
  }

  _buildRemoteItem(item) {
    const el = document.createElement('div');
    el.className = 'history-item';
    el.setAttribute('role', 'listitem');

    const op   = (item.operation ?? '').toLowerCase();
    const time = item.createdAt ? new Date(item.createdAt).toLocaleString() : '';
    const badge = `<span class="history-op-badge ${op}">${item.operation ?? op}</span>`;
    const res   = item.hasError
      ? `<span style="color:var(--clr-danger);font-size:.8rem">⚠ ${item.errorMessage}</span>`
      : (item.result != null ? `<div class="history-result">= ${item.result}</div>` : '');

    el.innerHTML = `
      <div class="history-item-top">
        ${badge}
        <span class="history-time">${time}</span>
      </div>
      <div class="history-desc">
        ${item.operand1 ? `From: ${JSON.stringify(item.operand1)}` : ''}
        ${item.operand2 ? ` · To: ${JSON.stringify(item.operand2)}` : ''}
      </div>
      ${res}`;
    return el;
  }

  _fmt(n) {
    if (typeof n !== 'number') return n;
    return Number.isInteger(n) ? n : parseFloat(n.toFixed(6));
  }
}

/* ═══════════════════════════════════════════════
   DASHBOARD APP — main controller
═══════════════════════════════════════════════ */
class DashboardApp {
  #type    = 'Length';
  #action  = 'compare';
  #history = new HistoryManager();
  #result  = new ResultRenderer();
  #histRen = new HistoryRenderer();
  #sessionCount = 0;

  constructor() {
    this._guardAuth();
    this._initUser();
    this._bindTypeCards();
    this._bindActionTabs();
    this._bindForm();
    this._bindLogout();
    this._bindRefresh();

    // Kick off initial UI sync
    this._renderForm();
    this._loadStats();    // Fetch total count from backend (shared across users)
    this._loadHistory();  // Fetch user-specific history from backend
  }

  /* ── Auth guard ── */
  _guardAuth() {
    if (!TokenStore.isLoggedIn()) {
      window.location.href = 'index.html';
    }
  }

  /* ── Display username ── */
  _initUser() {
    const user     = TokenStore.getUser();
    const uname    = user?.username ?? 'User';
    const display  = document.getElementById('username-display');
    const avatar   = document.getElementById('user-avatar');
    if (display) display.textContent = uname;
    if (avatar)  avatar.textContent  = uname.charAt(0).toUpperCase();

    // Update stat
    const statType = document.getElementById('stat-type');
    if (statType) statType.textContent = this.#type;
  }

  /* ── Type card selection ── */
  _bindTypeCards() {
    const grid = document.getElementById('type-grid');
    if (!grid) return;

    grid.querySelectorAll('.type-card').forEach(card => {
      card.addEventListener('click', () => {
        this.#type = card.dataset.type;

        // Update active state
        grid.querySelectorAll('.type-card').forEach(c => {
          c.classList.remove('active');
          c.setAttribute('aria-checked', 'false');
        });
        card.classList.add('active');
        card.setAttribute('aria-checked', 'true');

        // Update stat card
        const statType = document.getElementById('stat-type');
        if (statType) statType.textContent = this.#type;

        // Disable arithmetic tabs for Temperature
        this._updateTabAvailability();
        this._renderForm();
        this.#result.hide();
      });
    });
  }

  /* ── Action tab selection ── */
  _bindActionTabs() {
    const tabs = document.getElementById('action-tabs');
    if (!tabs) return;

    tabs.querySelectorAll('.action-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        if (tab.disabled) return;

        this.#action = tab.dataset.action;

        tabs.querySelectorAll('.action-tab').forEach(t => {
          t.classList.remove('active');
          t.setAttribute('aria-selected', 'false');
        });
        tab.classList.add('active');
        tab.setAttribute('aria-selected', 'true');

        this._renderForm();
        this.#result.hide();
      });
    });
  }

  /* ── Temperature limitation ── */
  _updateTabAvailability() {
    const isTemp = this.#type === 'Temperature';
    const tempNote = document.getElementById('temp-note');
    if (tempNote) tempNote.classList.toggle('hidden', !isTemp);

    document.querySelectorAll('.action-tab').forEach(tab => {
      const action = tab.dataset.action;
      const disabled = isTemp && !TEMP_ONLY.has(action);
      tab.disabled = disabled;
      tab.setAttribute('aria-disabled', String(disabled));
    });

    // If current action is now disabled, switch to compare
    if (isTemp && !TEMP_ONLY.has(this.#action)) {
      this.#action = 'compare';
      const tabCompare = document.getElementById('tab-compare');
      document.querySelectorAll('.action-tab').forEach(t => {
        t.classList.remove('active');
        t.setAttribute('aria-selected', 'false');
      });
      tabCompare?.classList.add('active');
      tabCompare?.setAttribute('aria-selected', 'true');
    }
  }

  /* ── Dynamically render form fields ── */
  _renderForm() {
    const container = document.getElementById('form-fields');
    if (!container) return;

    const units = UNITS[this.#type] ?? [];

    // Build HTML using FormBuilder class
    let html = '';
    if (this.#action === 'convert') {
      html = FormBuilder.convert(units);
    } else {
      html = FormBuilder.binary(this.#action, units);
    }

    container.innerHTML = html;
  }

  /* ── Form submit ── */
  _bindForm() {
    const form = document.getElementById('operation-form');
    if (!form) return;

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      await this._handleCalculate();
    });
  }

  /* ── Gather form values ── */
  _gatherInputs() {
    const q1Val  = parseFloat(document.getElementById('q1-val')?.value  ?? 0);
    const q1Unit = document.getElementById('q1-unit')?.value ?? '';
    const q2Val  = parseFloat(document.getElementById('q2-val')?.value  ?? 0);
    const q2Unit = document.getElementById('q2-unit')?.value ?? '';

    const q1 = { Value: q1Val, Unit: q1Unit, MeasurementType: this.#type };
    const q2 = { Value: q2Val, Unit: q2Unit, MeasurementType: this.#type };

    return { q1, q2, targetUnit: q2Unit };
  }

  /* ── Main calculate handler ── */
  async _handleCalculate() {
    const btn     = document.getElementById('btn-calculate');
    const spinner = document.getElementById('calc-spinner');
    const btnText = document.getElementById('calc-btn-text');

    if (!btn) return;

    // Loading state
    btn.disabled      = true;
    spinner?.classList.remove('hidden');
    if (btnText) btnText.textContent = 'Calculating…';

    this.#result.hide();

    try {
      const { q1, q2, targetUnit } = this._gatherInputs();

      // Validation
      if (isNaN(q1.Value)) throw new Error('Please enter a valid number for the first value.');
      if (this.#action !== 'convert' && isNaN(q2.Value)) {
        throw new Error('Please enter a valid number for the second value.');
      }

      let apiResult, histEntry;

      // Dispatch to correct service method (conditional logic)
      switch (this.#action) {
        case 'compare': {
          const r = await QuantityService.compare(q1, q2);
          const equal = r.areEqual;
          this.#result.show({
            label:  equal ? '✅ Equal' : '❌ Not Equal',
            value:  equal ? 'Quantities are equal' : 'Quantities are not equal',
            unit:   r.message ?? '',
            type:   equal ? 'equal' : 'not-equal',
          });
          histEntry = { action: 'compare', type: this.#type, q1, q2, result: r, timestamp: new Date() };
          break;
        }

        case 'convert': {
          const r = await QuantityService.convert(q1, targetUnit);
          this.#result.show({
            label: 'Converted Result',
            value: this._fmt(r.result),
            unit:  `${UNIT_LABELS[r.unit] ?? r.unit} (${r.unit})`,
            type:  'success',
          });
          histEntry = { action: 'convert', type: this.#type, q1, targetUnit, result: r, timestamp: new Date() };
          break;
        }

        case 'add': {
          const r = await QuantityService.add(q1, q2);
          this.#result.show({
            label: 'Sum',
            value: this._fmt(r.result),
            unit:  `${UNIT_LABELS[r.unit] ?? r.unit} (${r.unit})`,
            type:  'success',
          });
          histEntry = { action: 'add', type: this.#type, q1, q2, result: r, timestamp: new Date() };
          break;
        }

        case 'subtract': {
          const r = await QuantityService.subtract(q1, q2);
          this.#result.show({
            label: 'Difference',
            value: this._fmt(r.result),
            unit:  `${UNIT_LABELS[r.unit] ?? r.unit} (${r.unit})`,
            type:  'success',
          });
          histEntry = { action: 'subtract', type: this.#type, q1, q2, result: r, timestamp: new Date() };
          break;
        }

        case 'divide': {
          const r = await QuantityService.divide(q1, q2);
          this.#result.show({
            label: 'Ratio',
            value: this._fmt(r.result ?? r),
            unit:  '(dimensionless)',
            type:  'success',
          });
          histEntry = { action: 'divide', type: this.#type, q1, q2, result: r, timestamp: new Date() };
          break;
        }

        default:
          throw new Error(`Unknown action: ${this.#action}`);
      }

      // Push to local history
      this.#history.push(histEntry);
      this.#histRen.renderLocal(this.#history.getAll());

      // Session counter
      this.#sessionCount++;
      const statSess = document.getElementById('stat-session');
      if (statSess) statSess.textContent = this.#sessionCount;

      // Refresh total from backend (non-blocking)
      this._loadStats();

    } catch (err) {
      this.#result.error(err.message || 'Something went wrong. Is the backend running?');
      Toast.error(err.message || 'Calculation failed.');
    } finally {
      btn.disabled = false;
      spinner?.classList.add('hidden');
      if (btnText) btnText.textContent = '⚡ Calculate';
    }
  }

  /* ── Load stats (count) from backend ── */
  async _loadStats() {
    try {
      const data = await QuantityService.getCount();
      const total = data?.totalOperations ?? data?.total ?? '—';
      const el = document.getElementById('stat-total');
      if (el) el.textContent = total;
    } catch {
      // Silently fail — backend may not be running yet
    }
  }

  /* ── Load history from backend ── */
  async _loadHistory() {
    try {
      const items = await QuantityService.getHistory();
      if (Array.isArray(items) && items.length > 0) {
        this.#histRen.renderRemote(items);
        const countEl = document.getElementById('history-count');
        if (countEl) countEl.textContent = items.length;
      }
    } catch {
      // Silently fail
    }
  }

  /* ── Refresh button ── */
  _bindRefresh() {
    const btn = document.getElementById('btn-clear');
    if (!btn) return;
    btn.addEventListener('click', async () => {
      btn.textContent = '⏳ Loading…';
      btn.disabled = true;
      await this._loadHistory();
      await this._loadStats();
      btn.textContent = '🔄 Refresh';
      btn.disabled = false;
      Toast.success('History refreshed!');
    });
  }

  /* ── Logout ── */
  _bindLogout() {
    const btn = document.getElementById('btn-logout');
    if (!btn) return;
    btn.addEventListener('click', () => {
      TokenStore.clear();
      Toast.info('Logged out. See you soon!');
      setTimeout(() => window.location.href = 'index.html', 800);
    });
  }

  /* ── Format number sensibly ── */
  _fmt(n) {
    if (typeof n !== 'number') return n;
    if (Number.isInteger(n))   return n.toLocaleString();
    const fixed = parseFloat(n.toFixed(6));
    return fixed.toLocaleString(undefined, { maximumFractionDigits: 6 });
  }
}

/* ═══════════════════════════════════════════════
   BOOTSTRAP
═══════════════════════════════════════════════ */
document.addEventListener('DOMContentLoaded', () => {
  // Only boot on dashboard page
  if (document.getElementById('operation-form')) {
    new DashboardApp();
  }
});
