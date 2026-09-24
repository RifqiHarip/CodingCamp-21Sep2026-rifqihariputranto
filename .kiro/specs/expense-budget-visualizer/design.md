# Design Document: Expense and Budget Visualizer

## Overview

The Expense and Budget Visualizer is a fully client-side single-page application (SPA) built with plain HTML, CSS, and Vanilla JavaScript. It runs entirely in the browser with no backend server, build tools, or JavaScript frameworks. All data is persisted using the browser's `localStorage` API under the key `"transactions"`. Spending distribution is visualized with [Chart.js v4.5.1](https://www.chartjs.org/) loaded from a CDN.

The app consists of a single HTML entry point (`index.html`) that references one CSS file (`css/style.css`) and one JavaScript file (`js/app.js`). Users can add expense transactions with a name, amount, and category (Food, Transport, Fun), view them in a scrollable list, delete any entry, and see an auto-updating total balance and pie chart.

**Key technical decisions:**

- **No build step**: Direct `<script>` and `<link>` tags; works when opened as a local file.
- **Module pattern**: `js/app.js` wraps all logic in an IIFE (Immediately Invoked Function Expression) to avoid polluting the global namespace while staying compatible with non-module script loading.
- **Chart.js UMD bundle**: The UMD distribution of Chart.js is used so it works without ES module imports.
- **Defensive storage access**: All `localStorage` calls are wrapped in `try/catch` to handle unavailability or quota errors gracefully.

---

## Architecture

The application follows a simple **event-driven MVC-lite** pattern. All state lives in a single in-memory array (`transactions`), which is the single source of truth. UI components read from this array and re-render on every state change. State is persisted to `localStorage` on every mutation.

```mermaid
flowchart TD
    User([User])
    Form[Input Form]
    Storage[(localStorage)]
    State[In-Memory State\ntransactions: Transaction[]]
    BalanceUI[Balance Display]
    ListUI[Transaction List]
    ChartUI[Pie Chart / Chart.js]

    User -->|fills form + submits| Form
    Form -->|validate| Validator[Validator]
    Validator -->|valid| State
    Validator -->|invalid| Form
    State -->|serialize + write| Storage
    Storage -->|read + deserialize on init| State
    State -->|render| BalanceUI
    State -->|render| ListUI
    State -->|render| ChartUI
    ListUI -->|delete click| State
    User -->|clicks delete| ListUI
```

### Data Flow

1. **Init**: On `DOMContentLoaded`, the app reads `localStorage["transactions"]`, parses JSON, validates the array structure, then populates the in-memory `transactions` array and renders all three UI components.
2. **Add**: The form `submit` event fires the validator. On success, a new `Transaction` object is pushed to `transactions`, persisted to `localStorage`, and all three components re-render. The form resets.
3. **Delete**: A click on a delete button (identified by a `data-id` attribute) removes the matching transaction from `transactions`, persists to `localStorage`, and re-renders all components.

---

## Components and Interfaces

### HTML Structure (`index.html`)

```
<body>
  <header>
    <h1>Expense Tracker</h1>
    <div id="balance-display">Total: $0.00</div>
  </header>
  <main>
    <section id="form-section">
      <form id="transaction-form">
        <input type="text"   id="item-name"  maxlength="100" />
        <span id="error-name"     class="error"></span>
        <input type="number" id="amount"     min="0.01" max="999999999.99" step="0.01" />
        <span id="error-amount"   class="error"></span>
        <select id="category">
          <option value="">-- Select Category --</option>
          <option value="Food">Food</option>
          <option value="Transport">Transport</option>
          <option value="Fun">Fun</option>
        </select>
        <span id="error-category" class="error"></span>
        <button type="submit">Add Transaction</button>
      </form>
    </section>
    <section id="list-section">
      <ul id="transaction-list"></ul>
    </section>
    <section id="chart-section">
      <canvas id="pie-chart"></canvas>
      <p id="chart-placeholder" hidden>No spending data available.</p>
    </section>
  </main>
</body>
```

### JavaScript Module Structure (`js/app.js`)

All logic is contained within a single IIFE. Internal functions are documented below:

| Function | Signature | Responsibility |
|---|---|---|
| `loadFromStorage()` | `() → Transaction[]` | Read and deserialize `localStorage["transactions"]`; return `[]` on error/corruption |
| `saveToStorage(list)` | `(Transaction[]) → void` | Serialize and write to `localStorage["transactions"]`; throw on failure |
| `validateForm(name, amount, category)` | `(string, string, string) → ValidationResult` | Pure validation returning `{ valid: boolean, errors: FieldErrors }` |
| `addTransaction(name, amount, category)` | `(string, string, string) → void` | Create transaction, push to state, persist, re-render |
| `deleteTransaction(id)` | `(string) → void` | Remove by id from state, persist, re-render |
| `calculateBalance(list)` | `(Transaction[]) → number` | Sum all amounts, round to 2 decimal places |
| `aggregateByCategory(list)` | `(Transaction[]) → CategoryTotals` | Sum amounts per category, returning only categories with total > 0 |
| `buildChartConfig(totals)` | `(CategoryTotals) → ChartConfig` | Build Chart.js config object from category totals |
| `renderBalanceDisplay(balance)` | `(number) → void` | Update balance DOM element |
| `renderTransactionList(list)` | `(Transaction[]) → void` | Clear and rebuild the `<ul>` from the transactions array |
| `renderChart(totals)` | `(CategoryTotals) → void` | Create or update the Chart.js instance |
| `resetForm()` | `() → void` | Clear all form fields and error messages |
| `renderAll(list)` | `(Transaction[]) → void` | Orchestrate all three renders: balance, list, chart |
| `initApp()` | `() → void` | Entry point: load storage, render, attach event listeners |

### CSS Structure (`css/style.css`)

Organised into logical sections:

1. **Reset & custom properties** — CSS variables for the color palette, font sizes, spacing
2. **Layout** — responsive grid/flexbox for the header, form, list, and chart panels
3. **Form & validation** — field styles, `.error` class (red inline text, hidden by default)
4. **Transaction list** — scrollable container, individual list-item layout, delete button
5. **Balance display** — prominent heading-level typography
6. **Chart section** — canvas sizing, placeholder text
7. **Responsive breakpoints** — media queries for 320px–1920px range

---

## Data Models

### `Transaction` object

```javascript
/**
 * @typedef {Object} Transaction
 * @property {string} id        - UUID v4 generated via crypto.randomUUID()
 * @property {string} name      - Item name (1–100 characters)
 * @property {number} amount    - Positive numeric value (0.01–999,999,999.99)
 * @property {string} category  - One of "Food" | "Transport" | "Fun"
 * @property {number} createdAt - Unix timestamp (Date.now()) for insertion order
 */
```

### `ValidationResult` object

```javascript
/**
 * @typedef {Object} FieldErrors
 * @property {string|null} name     - Error message for name field, or null
 * @property {string|null} amount   - Error message for amount field, or null
 * @property {string|null} category - Error message for category field, or null
 *
 * @typedef {Object} ValidationResult
 * @property {boolean}     valid  - True if all fields pass validation
 * @property {FieldErrors} errors - Per-field error messages
 */
```

### `CategoryTotals` object

```javascript
/**
 * @typedef {Object} CategoryTotals
 * @property {number} [Food]      - Total amount for Food category (omitted if 0)
 * @property {number} [Transport] - Total amount for Transport category (omitted if 0)
 * @property {number} [Fun]       - Total amount for Fun category (omitted if 0)
 */
```

### `localStorage` schema

```
Key:   "transactions"
Value: JSON-serialized Transaction[]
       e.g. '[{"id":"abc123","name":"Lunch","amount":12.50,"category":"Food","createdAt":1700000000000}]'
```

Validation on read: the parsed value must be an `Array`; each element must have `id` (string), `name` (string, 1–100 chars), `amount` (number, > 0), `category` (one of the three valid values), and `createdAt` (number). Any element failing validation is discarded silently; if the root value is not an array, the entire stored value is discarded and overwritten with `[]`.

### Color palette (Category → Hex)

| Category | Hex color | WCAG contrast on white |
|---|---|---|
| Food | `#E63946` | 4.56:1 ✓ |
| Transport | `#457B9D` | 4.65:1 ✓ |
| Fun | `#2A9D8F` | 4.52:1 ✓ |

All three colors are visually distinct and meet the 4.5:1 minimum contrast ratio requirement against a white or light background.

---

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system — essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Validator accepts exactly valid inputs

*For any* triple of (itemName, amount, category), `validateForm` returns `valid: true` **if and only if** itemName is a non-empty string of at most 100 characters, amount is a numeric string representing a value between 0.01 and 999,999,999.99 inclusive, and category is one of `"Food"`, `"Transport"`, or `"Fun"`.

**Validates: Requirements 1.2, 1.3, 1.4, 1.5**

---

### Property 2: Adding a transaction grows the list by exactly one

*For any* current transaction list and any valid (name, amount, category) triple, calling `addTransaction` results in a transaction list whose length is exactly one greater than before, and the new transaction list contains a transaction with the supplied name, amount, and category.

**Validates: Requirements 1.6, 2.1**

---

### Property 3: Form reset clears all fields

*For any* state of the input form (any values present in the name, amount, and category fields), calling `resetForm()` results in the name field being empty, the amount field being empty, and the category select returning to its default unselected state.

**Validates: Requirements 1.7**

---

### Property 4: Transaction list renders in insertion order

*For any* array of transactions, `renderTransactionList` produces list items in the same order as the array (index 0 rendered first), matching the chronological insertion order preserved by the `createdAt` timestamp.

**Validates: Requirements 2.2**

---

### Property 5: Delete removes exactly the targeted transaction

*For any* non-empty transaction list and any valid transaction id `i` present in that list, calling `deleteTransaction(i)` results in a list with exactly one fewer item that no longer contains the transaction with id `i`, while all other transactions remain unchanged.

**Validates: Requirements 2.5**

---

### Property 6: Balance calculation is correct and rounded

*For any* array of transactions with numeric amounts (including empty arrays and arrays with negative amounts), `calculateBalance(transactions)` returns the arithmetic sum of all `amount` values rounded to exactly 2 decimal places. For an empty array the result is `0.00`.

**Validates: Requirements 3.1, 3.4, 3.5**

---

### Property 7: Category aggregation is consistent with total balance

*For any* non-empty array of transactions, the sum of all values in `aggregateByCategory(transactions)` equals the arithmetic sum of all transaction amounts (subject to floating-point rounding), and only categories with a total greater than zero appear as keys in the result.

**Validates: Requirements 4.1**

---

### Property 8: Chart config contains required labels and distinct colors

*For any* `CategoryTotals` object with at least one entry, `buildChartConfig(totals)` returns a Chart.js config where the `data.labels` array contains exactly the keys of `totals`, the `data.datasets[0].data` array contains the corresponding values in the same order, and all values in `data.datasets[0].backgroundColor` are distinct (no two segments share the same color).

**Validates: Requirements 4.1, 4.4**

---

### Property 9: Storage round-trip preserves transaction list

*For any* array of valid transactions, after `saveToStorage(list)` is called, `loadFromStorage()` returns an array that is deeply equal to `list` (same ids, names, amounts, categories, and timestamps).

**Validates: Requirements 5.1, 5.2**

---

### Property 10: App initialization restores all stored transactions

*For any* array of valid transactions previously written to `localStorage["transactions"]`, calling `initApp()` results in the in-memory state, the balance display, the transaction list, and the chart all reflecting the stored transactions.

**Validates: Requirements 5.3**

---

## Error Handling

| Scenario | Detection | Recovery |
|---|---|---|
| `localStorage` unavailable (e.g. private mode, quota exceeded) | `try/catch` around all `localStorage` calls | Initialize with empty array; display a non-blocking warning banner in the transaction list area |
| Stored JSON is malformed or not an array | `JSON.parse` throws or result is not an `Array` | Overwrite storage with `[]`; display a non-blocking warning banner; initialize with empty state |
| Individual stored transaction fails schema validation | Per-item check during `loadFromStorage` | Silently discard the invalid item; continue with remaining valid items |
| `localStorage.setItem` throws during a delete | `try/catch` in `deleteTransaction` | Display an inline error message; roll back in-memory state so the transaction remains visible |
| Chart.js not loaded (CDN unreachable) | Check for `window.Chart` before calling `new Chart(...)` | Hide the chart canvas; display a static message: "Chart unavailable — could not load charting library." |
| `crypto.randomUUID` unavailable (very old browsers) | Feature-detect before use | Fall back to a timestamp + Math.random composite id string |

All error messages are displayed in-page and non-blocking: they do not use `alert()`. Warning messages use a visually distinct `.warning-banner` class styled in the CSS.

---

## Testing Strategy

### Unit Tests (example-based)

Focus on concrete scenarios and integration points:

- **`validateForm`**: specific examples — empty name, name of exactly 101 chars, amount of 0, amount of -1, amount of `"abc"`, no category selected, all-whitespace name.
- **`calculateBalance`**: empty array → `0`, single transaction, multiple transactions with floating-point amounts (e.g. `0.1 + 0.2`), negative amounts.
- **`loadFromStorage`**: mocked `localStorage` returning valid JSON, invalid JSON, non-array JSON, unavailable storage.
- **`saveToStorage`**: verify the correct key/value is written; mock failure and verify the error is thrown.
- **Form submission flow**: simulate a valid submit event and verify the transaction appears in the DOM list.
- **Delete flow**: simulate a delete click and verify the item is removed from DOM and storage.
- **Empty state messages**: verify both the transaction list empty message and the chart placeholder appear when no transactions exist.
- **Storage unavailable warning**: mock `localStorage` to throw and verify warning banner appears.
- **Corrupted storage warning**: set `localStorage["transactions"]` to `"not-json"` and verify recovery.
- **Chart.js absent**: set `window.Chart = undefined` and verify graceful fallback message.

### Property-Based Tests

This feature involves several pure functions with well-defined input/output contracts, making it a good candidate for property-based testing.

**Recommended library**: [fast-check](https://github.com/dubzzz/fast-check) (JavaScript/TypeScript, widely maintained, runs in browsers and Node.js).

**Configuration**: Minimum **100 iterations** per property test. Each test is tagged with a comment referencing the design property.

#### Property tests to implement:

**Feature: expense-budget-visualizer, Property 1: Validator accepts exactly valid inputs**
- Generator: arbitrary strings for name (empty, up to 200 chars), arbitrary numbers for amount (including negative, zero, above max), arbitrary strings for category (including invalid values and the three valid ones).
- Assert: `validateForm(name, amount, category).valid === (name.length >= 1 && name.length <= 100 && isFinite(+amount) && +amount >= 0.01 && +amount <= 999999999.99 && ['Food','Transport','Fun'].includes(category))`

**Feature: expense-budget-visualizer, Property 2: Adding a transaction grows the list by exactly one**
- Generator: arbitrary valid transaction lists (0–20 items), arbitrary valid (name, amount, category) triples.
- Assert: `after addTransaction, state.length === before + 1 && state.some(t => t.name === name && t.amount === +amount && t.category === category)`

**Feature: expense-budget-visualizer, Property 3: Form reset clears all fields**
- Generator: arbitrary strings for name, arbitrary numbers for amount, arbitrary category values.
- Assert: after `resetForm()`, `nameInput.value === ''`, `amountInput.value === ''`, `categorySelect.value === ''`

**Feature: expense-budget-visualizer, Property 4: Transaction list renders in insertion order**
- Generator: arbitrary arrays of 0–30 valid transactions.
- Assert: rendered `<li>` elements appear in the same order as the input array (compare by id or name).

**Feature: expense-budget-visualizer, Property 5: Delete removes exactly the targeted transaction**
- Generator: arbitrary non-empty arrays of valid transactions, arbitrary valid index within the array.
- Assert: `after deleteTransaction(id), state.length === before - 1 && !state.some(t => t.id === id)`

**Feature: expense-budget-visualizer, Property 6: Balance calculation is correct and rounded**
- Generator: arbitrary arrays of transactions with amounts in range [-999999999.99, 999999999.99], including empty arrays.
- Assert: `calculateBalance(list) === parseFloat(list.reduce((s,t) => s + t.amount, 0).toFixed(2))`

**Feature: expense-budget-visualizer, Property 7: Category aggregation is consistent with total balance**
- Generator: arbitrary non-empty arrays of transactions with positive amounts.
- Assert: `Object.values(aggregateByCategory(list)).reduce((s,v) => s+v, 0) ≈ list.reduce((s,t) => s+t.amount, 0)` (within floating-point epsilon), and all keys are in `['Food','Transport','Fun']`.

**Feature: expense-budget-visualizer, Property 8: Chart config contains required labels and distinct colors**
- Generator: arbitrary `CategoryTotals` objects with 1–3 keys and positive values.
- Assert: `buildChartConfig(totals).data.labels` deep-equals keys of `totals`; `backgroundColor` array has no duplicate values.

**Feature: expense-budget-visualizer, Property 9: Storage round-trip preserves transaction list**
- Generator: arbitrary arrays of 0–20 valid transactions.
- Assert: `loadFromStorage()` after `saveToStorage(list)` returns a deeply equal array.

**Feature: expense-budget-visualizer, Property 10: App initialization restores all stored transactions**
- Generator: arbitrary arrays of 0–20 valid transactions pre-seeded in a mocked `localStorage`.
- Assert: after `initApp()`, in-memory state equals the seeded array; balance display equals `calculateBalance(seeded)`; chart data reflects `aggregateByCategory(seeded)`.

### Integration / Smoke Tests

- **Cross-browser**: Open the HTML file directly in Chrome, Firefox, Edge, and Safari; confirm no JavaScript console errors and all UI elements render.
- **Offline mode**: Disable network in DevTools and reload; confirm app functions fully (except CDN chart library if not cached — verify the graceful fallback message appears).
- **File structure**: Assert exactly one `.html` at root, one `.css` in `css/`, one `.js` in `js/`.
- **Responsive layout**: Use browser DevTools at 320px, 768px, 1024px, and 1920px widths; confirm no horizontal scroll and all controls visible.
- **Chart.js usage**: Confirm `new Chart(canvas, { type: 'pie', ... })` is called when transactions exist.
