/* js/app.js — Expense and Budget Visualizer */
(function () {
  'use strict';

  // ---------------------------------------------------------------------------
  // Constants
  // ---------------------------------------------------------------------------

  /** @type {string} localStorage key used for persistence */
  var STORAGE_KEY = 'transactions';

  /** @type {string[]} Valid category values */
  var VALID_CATEGORIES = ['Food', 'Transport', 'Fun'];

  /**
   * Hex color assigned to each category for the pie chart.
   * All three values are visually distinct and meet WCAG 4.5:1 contrast on white.
   * @type {Object.<string, string>}
   */
  var CATEGORY_COLORS = {
    Food:      '#E63946',
    Transport: '#457B9D',
    Fun:       '#2A9D8F',
  };

  // ---------------------------------------------------------------------------
  // In-memory state (single source of truth)
  // ---------------------------------------------------------------------------

  /** @type {Transaction[]} */
  var transactions = [];

  /** @type {Chart|null} Holds the active Chart.js instance so it can be destroyed before re-creation */
  var chartInstance = null;

  // ---------------------------------------------------------------------------
  // Utility: Warning Banner
  // ---------------------------------------------------------------------------

  /**
   * Displays a non-blocking warning banner inside the list section.
   * Re-uses an existing banner element if one is already present so that
   * multiple calls do not stack duplicate banners.
   *
   * @param {string} message - Human-readable warning message to display.
   */
  function showWarningBanner(message) {
    var listSection = document.getElementById('list-section');
    if (!listSection) return; // Guard: called before DOM is ready (e.g. in tests)

    var existing = listSection.querySelector('.warning-banner');
    if (existing) {
      existing.textContent = message;
      return;
    }

    var banner = document.createElement('p');
    banner.className = 'warning-banner';
    banner.setAttribute('role', 'alert');
    banner.textContent = message;

    // Insert at the top of the list section, before any children
    listSection.insertBefore(banner, listSection.firstChild);
  }

  // ---------------------------------------------------------------------------
  // Schema validation helper
  // ---------------------------------------------------------------------------

  /**
   * Returns true if the given item conforms to the Transaction schema.
   *
   * Schema:
   *   id        — string (non-empty)
   *   name      — string, 1–100 characters
   *   amount    — number, strictly > 0
   *   category  — one of VALID_CATEGORIES
   *   createdAt — number (unix timestamp)
   *
   * @param {*} item
   * @returns {boolean}
   */
  function isValidTransaction(item) {
    if (!item || typeof item !== 'object' || Array.isArray(item)) return false;
    if (typeof item.id !== 'string' || item.id.length === 0) return false;
    if (
      typeof item.name !== 'string' ||
      item.name.length < 1 ||
      item.name.length > 100
    ) return false;
    if (typeof item.amount !== 'number' || item.amount <= 0) return false;
    if (!VALID_CATEGORIES.includes(item.category)) return false;
    if (typeof item.createdAt !== 'number') return false;
    return true;
  }

  // ---------------------------------------------------------------------------
  // Storage functions
  // ---------------------------------------------------------------------------

  /**
   * Reads the transaction list from localStorage["transactions"].
   *
   * Behaviour:
   * - If localStorage is unavailable (throws), returns [] and shows a warning.
   * - If the stored value fails JSON parsing or the root value is not an Array,
   *   overwrites storage with [] and shows a warning, then returns [].
   * - If the root is a valid Array, each element is individually validated;
   *   items failing schema validation are silently discarded.
   *
   * @returns {Transaction[]}
   */
  function loadFromStorage() {
    var raw;

    // --- Req 5.4: guard against unavailable storage ---
    try {
      raw = localStorage.getItem(STORAGE_KEY);
    } catch (e) {
      showWarningBanner(
        'Local storage is not available. Your transactions will not be saved.'
      );
      return [];
    }

    // Nothing stored yet — clean initial state, no warning needed
    if (raw === null) {
      return [];
    }

    // --- Req 5.5: guard against malformed / non-array JSON ---
    var parsed;
    try {
      parsed = JSON.parse(raw);
    } catch (e) {
      // JSON parsing failed — overwrite corrupted data
      _overwriteStorageWithEmpty();
      showWarningBanner(
        'Saved data could not be recovered (corrupted). Starting fresh.'
      );
      return [];
    }

    if (!Array.isArray(parsed)) {
      // Root value is not an array — overwrite corrupted data
      _overwriteStorageWithEmpty();
      showWarningBanner(
        'Saved data could not be recovered (invalid format). Starting fresh.'
      );
      return [];
    }

    // --- Per-item schema validation: silently discard invalid items ---
    var valid = parsed.filter(isValidTransaction);
    return valid;
  }

  /**
   * Overwrites localStorage["transactions"] with an empty array.
   * Silently swallows errors (storage may be unavailable).
   * @private
   */
  function _overwriteStorageWithEmpty() {
    try {
      localStorage.setItem(STORAGE_KEY, '[]');
    } catch (e) {
      // Cannot write — nothing more we can do
    }
  }

  // ---------------------------------------------------------------------------
  // Stubs for functions implemented in subsequent tasks
  // ---------------------------------------------------------------------------

  /**
   * Serializes and writes the transaction list to localStorage.
   * @param {Transaction[]} list
   */
  function saveToStorage(list) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
    } catch (err) {
      throw err;
    }
  }

  /**
   * Pure validation function for the Add-Transaction form.
   * @param {string} name
   * @param {string} amount
   * @param {string} category
   * @returns {{ valid: boolean, errors: { name: string|null, amount: string|null, category: string|null } }}
   */
  function validateForm(name, amount, category) {
    var errors = { name: null, amount: null, category: null };

    // --- name validation (Req 1.3) ---
    if (typeof name !== 'string' || name.trim().length === 0) {
      errors.name = 'Item name is required.';
    } else if (name.length > 100) {
      errors.name = 'Item name must be 100 characters or fewer.';
    }

    // --- amount validation (Req 1.4) ---
    var amountNum = parseFloat(amount);
    if (
      amount === '' ||
      amount === null ||
      amount === undefined ||
      isNaN(amountNum) ||
      amountNum < 0.01 ||
      amountNum > 999999999.99
    ) {
      errors.amount = 'Amount must be a number between 0.01 and 999,999,999.99.';
    }

    // --- category validation (Req 1.5) ---
    if (!VALID_CATEGORIES.includes(category)) {
      errors.category = 'Please select a valid category.';
    }

    var valid = errors.name === null && errors.amount === null && errors.category === null;
    return { valid: valid, errors: errors };
  }

  /**
   * Returns the arithmetic sum of all transaction amounts, rounded to 2 d.p.
   * Returns 0 for an empty array. Handles negative amounts (Req 3.5).
   *
   * Uses parseFloat(toFixed(2)) to avoid floating-point artefacts like
   * 0.1 + 0.2 = 0.30000000000000004.
   *
   * @param {Transaction[]} list
   * @returns {number}
   */
  function calculateBalance(list) { // eslint-disable-line no-unused-vars
    if (!list || list.length === 0) return 0;
    var sum = list.reduce(function (acc, t) {
      return acc + t.amount;
    }, 0);
    return parseFloat(sum.toFixed(2));
  }

  /**
   * Aggregates transaction amounts by category.
   * @param {Transaction[]} list
   * @returns {CategoryTotals}
   */
  /**
   * Aggregates transaction amounts by category.
   *
   * Returns a `CategoryTotals` object containing only categories whose total
   * is greater than zero (Req 4.1).
   *
   * @param {Transaction[]} list
   * @returns {CategoryTotals}
   */
  function aggregateByCategory(list) { // eslint-disable-line no-unused-vars
    var totals = {};
    if (!list || list.length === 0) return totals;

    list.forEach(function (t) {
      if (!VALID_CATEGORIES.includes(t.category)) return;
      totals[t.category] = (totals[t.category] || 0) + t.amount;
    });

    // Remove any category whose total is not greater than zero
    Object.keys(totals).forEach(function (key) {
      if (totals[key] <= 0) {
        delete totals[key];
      }
    });

    return totals;
  }

  /**
   * Builds a Chart.js pie config object from category totals.
   *
   * Each key in `totals` becomes a chart label, its value becomes the
   * corresponding data point, and the color is looked up from CATEGORY_COLORS
   * so that every segment has a distinct hex color.
   *
   * @param {CategoryTotals} totals - Object whose keys are category names and
   *   values are their aggregated amounts (only categories with total > 0).
   * @returns {{ type: string, data: { labels: string[], datasets: Array } }}
   *   A Chart.js-compatible config object ready to pass to `new Chart(canvas, config)`.
   */
  function buildChartConfig(totals) { // eslint-disable-line no-unused-vars
    var labels = Object.keys(totals);
    var data   = labels.map(function (label) { return totals[label]; });
    var colors = labels.map(function (label) { return CATEGORY_COLORS[label]; });

    return {
      type: 'pie',
      data: {
        labels: labels,
        datasets: [
          {
            data:            data,
            backgroundColor: colors,
          },
        ],
      },
      options: {
        plugins: {
          legend: {
            display: true,
            position: 'bottom',
          },
          tooltip: {
            callbacks: {
              label: function (context) {
                var value   = context.parsed;
                var total   = context.dataset.data.reduce(function (s, v) { return s + v; }, 0);
                var percent = total > 0 ? ((value / total) * 100).toFixed(1) : '0.0';
                return context.label + ': $' + value.toFixed(2) + ' (' + percent + '%)';
              },
            },
          },
        },
      },
    };
  }

  /**
   * Updates the #balance-display element.
   * Formats the balance to exactly 2 decimal places, e.g. "Total: $12.50".
   * @param {number} balance
   */
  function renderBalanceDisplay(balance) { // eslint-disable-line no-unused-vars
    var el = document.getElementById('balance-display');
    if (!el) return; // Guard: called before DOM is ready (e.g. in tests)
    el.textContent = 'Total: $' + balance.toFixed(2);
  }

  /**
   * Clears and rebuilds the #transaction-list <ul>.
   *
   * - If `list` is empty, renders a single empty-state <li> message (Req 2.4).
   * - Otherwise renders items in array order (oldest-first by createdAt, Req 2.2).
   * - Each <li> shows name, amount (2 d.p.), category, and a delete button
   *   with a `data-id` attribute set to the transaction id (Req 2.1).
   *
   * @param {Transaction[]} list
   */
  function renderTransactionList(list) { // eslint-disable-line no-unused-vars
    var ul = document.getElementById('transaction-list');
    if (!ul) return; // Guard: called before DOM is ready (e.g. in tests)

    // Clear existing items
    ul.innerHTML = '';

    // --- Req 2.4: empty-state message ---
    if (!list || list.length === 0) {
      var emptyLi = document.createElement('li');
      emptyLi.className = 'transaction-empty';
      emptyLi.textContent = 'No transactions recorded.';
      ul.appendChild(emptyLi);
      return;
    }

    // --- Req 2.2: render in chronological order (oldest first via createdAt) ---
    var sorted = list.slice().sort(function (a, b) {
      return a.createdAt - b.createdAt;
    });

    sorted.forEach(function (transaction) {
      // --- Req 2.1: show name, amount (2 d.p.), category, and delete button ---
      var li = document.createElement('li');
      li.className = 'transaction-item';
      li.setAttribute('data-id', transaction.id);

      var nameSpan = document.createElement('span');
      nameSpan.className = 'transaction-name';
      nameSpan.textContent = transaction.name;

      var amountSpan = document.createElement('span');
      amountSpan.className = 'transaction-amount';
      amountSpan.textContent = '$' + transaction.amount.toFixed(2);

      var categorySpan = document.createElement('span');
      categorySpan.className = 'transaction-category';
      categorySpan.textContent = transaction.category;

      var deleteBtn = document.createElement('button');
      deleteBtn.className = 'btn-delete';
      deleteBtn.type = 'button';
      deleteBtn.setAttribute('data-id', transaction.id);
      deleteBtn.setAttribute('aria-label', 'Delete ' + transaction.name);
      deleteBtn.textContent = 'Delete';

      li.appendChild(nameSpan);
      li.appendChild(amountSpan);
      li.appendChild(categorySpan);
      li.appendChild(deleteBtn);

      ul.appendChild(li);
    });
  }

  /**
   * Creates or updates the Chart.js pie chart.
   *
   * Behaviour:
   * - If Chart.js is unavailable (window.Chart absent or window undefined):
   *   hides the canvas, shows the placeholder with an unavailability message.
   * - If `totals` is empty (no keys with a positive value):
   *   destroys any existing chart, hides the canvas, shows the placeholder
   *   with "No spending data available." (Req 4.3).
   * - Otherwise: shows the canvas, hides the placeholder, destroys any existing
   *   chart instance, then creates a fresh one via buildChartConfig (Req 4.1–4.5).
   *
   * Guards against missing DOM elements (e.g. called in a test environment).
   *
   * @param {CategoryTotals} totals
   */
  function renderChart(totals) { // eslint-disable-line no-unused-vars
    var canvas      = document.getElementById('pie-chart');
    var placeholder = document.getElementById('chart-placeholder');

    // Guard: DOM not ready or elements absent (e.g. test environment)
    if (!canvas || !placeholder) return;

    // --- Req 4.5 / Error handling: Chart.js unavailable ---
    if (typeof window === 'undefined' || !window.Chart) {
      canvas.style.display = 'none';
      placeholder.hidden   = false;
      placeholder.textContent = 'Chart unavailable \u2014 could not load charting library.';
      return;
    }

    // Determine whether there is any data to display
    var keys     = Object.keys(totals || {});
    var hasData  = keys.some(function (k) { return totals[k] > 0; });

    if (!hasData) {
      // --- Req 4.3: no transactions → placeholder, no chart ---
      if (chartInstance) {
        chartInstance.destroy();
        chartInstance = null;
      }
      canvas.style.display    = 'none';
      placeholder.hidden      = false;
      placeholder.textContent = 'No spending data available.';
      return;
    }

    // --- Req 4.1, 4.2, 4.4: render / update the chart ---
    canvas.style.display = '';   // make canvas visible
    placeholder.hidden   = true;

    // Destroy the previous instance before creating a new one to avoid
    // Chart.js "Canvas is already in use" warnings (Req 4.2).
    if (chartInstance) {
      chartInstance.destroy();
      chartInstance = null;
    }

    var config   = buildChartConfig(totals);
    chartInstance = new window.Chart(canvas, config);
  }

  /**
   * Orchestrates all three render calls.
   * Satisfies Req 3.2, 3.3 (balance updates on add/delete) and
   * Req 4.2 (pie chart re-renders on add/delete).
   * @param {Transaction[]} list
   */
  function renderAll(list) { // eslint-disable-line no-unused-vars
    renderBalanceDisplay(calculateBalance(list));
    renderTransactionList(list);
    renderChart(aggregateByCategory(list));
  }

  /**
   * Clears all form fields and hides all inline error spans.
   *
   * After a successful transaction submission (Req 1.7):
   * - Sets #item-name to ''
   * - Sets #amount to ''
   * - Sets #category to '' (default unselected state)
   * - Hides #error-name, #error-amount, #error-category by setting display:none
   */
  function resetForm() { // eslint-disable-line no-unused-vars
    var nameInput    = document.getElementById('item-name');
    var amountInput  = document.getElementById('amount');
    var categorySelect = document.getElementById('category');

    if (nameInput)     nameInput.value    = '';
    if (amountInput)   amountInput.value  = '';
    if (categorySelect) categorySelect.value = '';

    // Hide all error spans
    var errorIds = ['error-name', 'error-amount', 'error-category'];
    errorIds.forEach(function (id) {
      var el = document.getElementById(id);
      if (el) el.style.display = 'none';
    });
  }

  /**
   * Generates a unique ID for a transaction.
   * Uses crypto.randomUUID() when available; falls back to a timestamp +
   * random string composite for older browsers (Req 6.1).
   * @returns {string}
   * @private
   */
  function _generateId() {
    if (
      typeof crypto !== 'undefined' &&
      typeof crypto.randomUUID === 'function'
    ) {
      return crypto.randomUUID();
    }
    // Fallback: timestamp + random base-36 suffix
    return Date.now() + '-' + Math.random().toString(36).substr(2, 9);
  }

  /**
   * Creates a new Transaction, persists it, and re-renders all UI components.
   *
   * Steps (Req 1.6, 5.1):
   * 1. Generate a unique id via _generateId().
   * 2. Build a Transaction object with the supplied fields plus a createdAt
   *    timestamp; amount is parsed to a float so it is stored as a number.
   * 3. Push to the in-memory `transactions` array.
   * 4. Persist via saveToStorage().
   * 5. Re-render all UI components via renderAll().
   *
   * @param {string} name     - Item name (already validated, non-empty, ≤100 chars)
   * @param {string} amount   - Amount string (already validated; parsed to float)
   * @param {string} category - One of "Food" | "Transport" | "Fun"
   */
  function addTransaction(name, amount, category) { // eslint-disable-line no-unused-vars
    var transaction = {
      id:        _generateId(),
      name:      name,
      amount:    parseFloat(amount),
      category:  category,
      createdAt: Date.now(),
    };

    transactions.push(transaction);

    saveToStorage(transactions);
    renderAll(transactions);
  }

  /**
   * Removes a transaction from state by id.
   * @param {string} id
   */
  function deleteTransaction(id) { // eslint-disable-line no-unused-vars
    // Find the transaction and its index before removal
    var index = transactions.findIndex(function (t) { return t.id === id; });
    if (index === -1) return; // Transaction not found — nothing to do

    // Remove from in-memory state
    var removed = transactions.splice(index, 1)[0];

    // --- Req 5.2: persist the updated list ---
    try {
      saveToStorage(transactions);
    } catch (err) {
      // --- Req 2.6: roll back on storage failure ---
      transactions.splice(index, 0, removed);
      showWarningBanner(
        'Could not delete transaction — storage error. Please try again.'
      );
      renderAll(transactions);
      return;
    }

    // --- Req 2.7: re-render all UI components after successful deletion ---
    renderAll(transactions);
  }

  // ---------------------------------------------------------------------------
  // App entry point
  // ---------------------------------------------------------------------------

  /**
   * Initialises the app: loads storage, renders UI, attaches event listeners.
   * Registered on DOMContentLoaded.
   *
   * Steps (Req 5.3, 1.6, 2.5):
   * 1. Load persisted transactions and render all UI components.
   * 2. Attach the form submit listener with full validation logic (Req 1.2–1.7).
   * 3. Attach a delegated click listener on #transaction-list for delete buttons (Req 2.5).
   */
  function initApp() {
    // --- Req 5.3: restore persisted transactions and render initial UI ---
    transactions = loadFromStorage();
    renderAll(transactions);

    // --- Req 1.6: form submit handler with validation ---
    var form = document.getElementById('transaction-form');
    if (form) {
      form.addEventListener('submit', function (e) {
        e.preventDefault();

        var nameInput      = document.getElementById('item-name');
        var amountInput    = document.getElementById('amount');
        var categorySelect = document.getElementById('category');

        var name     = nameInput     ? nameInput.value     : '';
        var amount   = amountInput   ? amountInput.value   : '';
        var category = categorySelect ? categorySelect.value : '';

        var result = validateForm(name, amount, category);

        // Show or hide each inline error span based on validation result
        var errorNameEl     = document.getElementById('error-name');
        var errorAmountEl   = document.getElementById('error-amount');
        var errorCategoryEl = document.getElementById('error-category');

        if (errorNameEl) {
          if (result.errors.name) {
            errorNameEl.textContent    = result.errors.name;
            errorNameEl.style.display  = 'block';
          } else {
            errorNameEl.style.display  = 'none';
          }
        }

        if (errorAmountEl) {
          if (result.errors.amount) {
            errorAmountEl.textContent   = result.errors.amount;
            errorAmountEl.style.display = 'block';
          } else {
            errorAmountEl.style.display = 'none';
          }
        }

        if (errorCategoryEl) {
          if (result.errors.category) {
            errorCategoryEl.textContent   = result.errors.category;
            errorCategoryEl.style.display = 'block';
          } else {
            errorCategoryEl.style.display = 'none';
          }
        }

        // Only add the transaction when all fields are valid (Req 1.6)
        if (result.valid) {
          addTransaction(name, amount, category);
          resetForm();
        }
      });
    }

    // --- Req 2.5: delegated click listener for delete buttons ---
    var list = document.getElementById('transaction-list');
    if (list) {
      list.addEventListener('click', function (e) {
        // Walk up from the click target to find a .btn-delete with a data-id
        var target = e.target;
        while (target && target !== list) {
          if (
            target.classList &&
            target.classList.contains('btn-delete') &&
            target.getAttribute('data-id')
          ) {
            deleteTransaction(target.getAttribute('data-id'));
            return;
          }
          target = target.parentNode;
        }
      });
    }
  }

  // Only register the DOM event listener when running in a browser environment
  if (typeof document !== 'undefined') {
    document.addEventListener('DOMContentLoaded', initApp);
  }

  // ---------------------------------------------------------------------------
  // Test exports
  // Conditionally expose pure functions so the test harness (Node / Vitest)
  // can import them without running the browser IIFE side-effects.
  // ---------------------------------------------------------------------------
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
      loadFromStorage: loadFromStorage,
      saveToStorage: saveToStorage,
      validateForm: validateForm,
      calculateBalance: calculateBalance,
      aggregateByCategory: aggregateByCategory,
      buildChartConfig: buildChartConfig,
      renderBalanceDisplay: renderBalanceDisplay,
      renderTransactionList: renderTransactionList,
      renderChart: renderChart,
      resetForm: resetForm,
      addTransaction: addTransaction,
      deleteTransaction: deleteTransaction,
      isValidTransaction: isValidTransaction,
      showWarningBanner: showWarningBanner,
      initApp: initApp,
      STORAGE_KEY: STORAGE_KEY,
      VALID_CATEGORIES: VALID_CATEGORIES,
      CATEGORY_COLORS: CATEGORY_COLORS,
      // Expose internal state getter for testing
      getTransactions: function () { return transactions; },
      setTransactions: function (list) { transactions = list; },
    };
  }
})();
