# Implementation Plan: Expense and Budget Visualizer

## Overview

Implement a fully client-side expense tracker using plain HTML, CSS, and Vanilla JavaScript (IIFE pattern). Chart.js v4.5.1 is loaded from a CDN. All data is persisted in `localStorage` under the key `"transactions"`. The app is structured as one HTML file at the project root, one CSS file at `css/style.css`, and one JavaScript file at `js/app.js`.

## Tasks

- [x] 1. Set up project structure and HTML entry point
  - Create `index.html` at the project root with the complete HTML skeleton: `<header>` containing `#balance-display`, `<section id="form-section">` with the transaction form (fields: `#item-name`, `#amount`, `#category`; error spans `#error-name`, `#error-amount`, `#error-category`), `<section id="list-section">` with `<ul id="transaction-list">`, and `<section id="chart-section">` with `<canvas id="pie-chart">` and `<p id="chart-placeholder">`
  - Include Chart.js v4.5.1 UMD CDN `<script>` tag before `js/app.js`
  - Link `css/style.css` in `<head>`
  - Link `js/app.js` with `defer` at the bottom of `<body>`
  - Create the `css/` and `js/` directories
  - _Requirements: 6.2, 6.3, 6.4_

- [x] 2. Implement CSS layout and visual design
  - [x] 2.1 Create `css/style.css` with reset, CSS custom properties (color palette: Food `#E63946`, Transport `#457B9D`, Fun `#2A9D8F`), and base typography (body ≥ 14px, headings ≥ 18px, all color pairs ≥ 4.5:1 contrast)
    - _Requirements: 7.3_
  - [x] 2.2 Implement responsive flexbox/grid layout covering the header, form section, list section, and chart section; add media queries so the interface remains usable at 320px–1920px without horizontal scrolling
    - _Requirements: 7.4_
  - [x] 2.3 Add form and validation styles: field focus states, `.error` class (red inline text, hidden by default via `display:none` toggled to `display:block`), `.warning-banner` class for non-blocking storage warnings
    - _Requirements: 1.3, 1.4, 1.5, 5.4_
  - [x] 2.4 Style the transaction list: scrollable `<ul>` container (overflow-y: auto), list-item layout showing name/amount/category plus a delete button, empty-state message
    - _Requirements: 2.3, 2.4_
  - [x] 2.5 Style the balance display, chart canvas sizing, and chart placeholder text
    - _Requirements: 3.1, 4.3_

- [x] 3. Implement core data utilities in `js/app.js` (IIFE skeleton + pure functions)
  - [x] 3.1 Create `js/app.js` with an IIFE wrapper; implement `loadFromStorage()` — reads `localStorage["transactions"]`, parses JSON, validates that the root value is an array, discards any item failing schema validation (id string, name 1–100 chars, amount number > 0, category in valid set, createdAt number), overwrites storage with `[]` and shows a warning banner on corruption, returns `[]` and shows a warning banner when storage is unavailable
    - _Requirements: 5.3, 5.4, 5.5_
  - [ ]* 3.2 Write property test for `loadFromStorage` / `saveToStorage` round-trip (Property 9)
    - **Property 9: Storage round-trip preserves transaction list**
    - **Validates: Requirements 5.1, 5.2**
  - [x] 3.3 Implement `saveToStorage(list)` — serializes the array and writes to `localStorage["transactions"]`; wraps in `try/catch` and throws on failure
    - _Requirements: 5.1, 5.2_
  - [x] 3.4 Implement `validateForm(name, amount, category)` — pure function returning `{ valid, errors: { name, amount, category } }`; checks name non-empty and ≤ 100 chars, amount numeric and in 0.01–999,999,999.99, category one of Food/Transport/Fun
    - _Requirements: 1.2, 1.3, 1.4, 1.5_
  - [ ]* 3.5 Write property test for `validateForm` (Property 1)
    - **Property 1: Validator accepts exactly valid inputs**
    - **Validates: Requirements 1.2, 1.3, 1.4, 1.5**
  - [x] 3.6 Implement `calculateBalance(list)` — returns arithmetic sum of all `amount` values rounded to 2 decimal places; returns `0` for empty array
    - _Requirements: 3.1, 3.4, 3.5_
  - [ ]* 3.7 Write property test for `calculateBalance` (Property 6)
    - **Property 6: Balance calculation is correct and rounded**
    - **Validates: Requirements 3.1, 3.4, 3.5**
  - [x] 3.8 Implement `aggregateByCategory(list)` — returns a `CategoryTotals` object containing only categories whose total is > 0
    - _Requirements: 4.1_
  - [ ]* 3.9 Write property test for `aggregateByCategory` (Property 7)
    - **Property 7: Category aggregation is consistent with total balance**
    - **Validates: Requirements 4.1**
  - [x] 3.10 Implement `buildChartConfig(totals)` — returns a Chart.js pie config with labels, data, and `backgroundColor` array using the defined category color constants; all colors must be distinct
    - _Requirements: 4.1, 4.4_
  - [ ]* 3.11 Write property test for `buildChartConfig` (Property 8)
    - **Property 8: Chart config contains required labels and distinct colors**
    - **Validates: Requirements 4.1, 4.4**

- [ ] 4. Checkpoint — verify pure functions before wiring UI
  - Ensure all tests pass, ask the user if questions arise.

- [x] 5. Implement render functions and state mutation functions
  - [x] 5.1 Implement `renderBalanceDisplay(balance)` — updates the `#balance-display` element text; formats to 2 decimal places
    - _Requirements: 3.1, 3.2, 3.3_
  - [x] 5.2 Implement `renderTransactionList(list)` — clears and rebuilds `<ul id="transaction-list">`; renders items in array order (oldest first via `createdAt`); shows empty-state message when list is empty; each `<li>` displays name, amount (2 decimal places), category, and a delete button with a `data-id` attribute
    - _Requirements: 2.1, 2.2, 2.4_
  - [ ]* 5.3 Write property test for `renderTransactionList` insertion order (Property 4)
    - **Property 4: Transaction list renders in insertion order**
    - **Validates: Requirements 2.2**
  - [x] 5.4 Implement `renderChart(totals)` — creates or updates the Chart.js instance on `#pie-chart`; shows `#chart-placeholder` and hides the canvas when totals is empty; feature-detects `window.Chart` before instantiating and displays a static unavailability message if absent; destroys the previous chart instance before creating a new one
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_
  - [x] 5.5 Implement `renderAll(list)` — orchestrates `renderBalanceDisplay(calculateBalance(list))`, `renderTransactionList(list)`, and `renderChart(aggregateByCategory(list))`
    - _Requirements: 3.2, 3.3, 4.2_
  - [x] 5.6 Implement `resetForm()` — clears `#item-name`, `#amount`, `#category`, and hides all error spans
    - _Requirements: 1.7_
  - [ ]* 5.7 Write property test for `resetForm` (Property 3)
    - **Property 3: Form reset clears all fields**
    - **Validates: Requirements 1.7**
  - [x] 5.8 Implement `addTransaction(name, amount, category)` — generates a UUID via `crypto.randomUUID()` (falls back to timestamp + `Math.random()` if unavailable), creates a `Transaction` object with `createdAt: Date.now()`, pushes to the in-memory `transactions` array, calls `saveToStorage`, and calls `renderAll`
    - _Requirements: 1.6, 5.1_
  - [ ]* 5.9 Write property test for `addTransaction` growing the list by exactly one (Property 2)
    - **Property 2: Adding a transaction grows the list by exactly one**
    - **Validates: Requirements 1.6, 2.1**
  - [x] 5.10 Implement `deleteTransaction(id)` — removes the matching transaction from the in-memory array, calls `saveToStorage`; on storage failure rolls back the removal and displays an inline error message, then calls `renderAll`
    - _Requirements: 2.5, 2.6, 2.7_
  - [ ]* 5.11 Write property test for `deleteTransaction` removing exactly the targeted transaction (Property 5)
    - **Property 5: Delete removes exactly the targeted transaction**
    - **Validates: Requirements 2.5**

- [x] 6. Implement `initApp` and attach event listeners
  - [~] 6.1 Implement `initApp()` — calls `loadFromStorage()`, populates the in-memory `transactions` array, calls `renderAll`, and attaches the form `submit` listener and the `#transaction-list` delegated `click` listener (delete button via `data-id`); register `initApp` on `DOMContentLoaded`
    - _Requirements: 5.3, 1.6, 2.5_
  - [ ]* 6.2 Write property test for `initApp` restoring all stored transactions (Property 10)
    - **Property 10: App initialization restores all stored transactions**
    - **Validates: Requirements 5.3**
  - [x] 6.3 Wire up form `submit` handler — call `validateForm`, display inline field errors for any failures (show/hide `.error` spans), call `addTransaction` and `resetForm` only when validation passes; ensure the whole flow completes within 2 seconds
    - _Requirements: 1.2, 1.3, 1.4, 1.5, 1.6, 1.7_

- [ ] 7. Checkpoint — end-to-end smoke test
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 8. Set up fast-check property-based test harness
  - [ ] 8.1 Add fast-check as a dev dependency and configure a test runner (e.g. Vitest or Jest) that can import `js/app.js` functions; export the pure functions for testing by conditionally exposing them at the bottom of the IIFE (e.g. `if (typeof module !== 'undefined') module.exports = { ... }` or a test-only global)
    - _Requirements: (testing infrastructure)_
  - [ ]* 8.2 Implement all 10 property-based tests using fast-check with a minimum of 100 iterations each, referencing the property numbers from the design document (Properties 1–10); mock `localStorage` and the DOM as needed; each test file annotated with the property number and the requirements clause it validates
    - _Requirements: 1.2, 1.6, 1.7, 2.2, 2.5, 3.1, 3.4, 3.5, 4.1, 4.4, 5.1, 5.2, 5.3_

- [ ] 9. Final checkpoint — full test suite and browser verification
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP
- Each task references the specific requirements acceptance criteria it satisfies
- Property tests are placed close to their corresponding implementation tasks to catch regressions early
- Checkpoints at tasks 4, 7, and 9 provide incremental validation gates
- The IIFE pattern means pure functions must be explicitly exported (or attached to a test-only global) before they can be unit-tested outside the browser
- `crypto.randomUUID` fallback (task 5.8) ensures compatibility with older browsers per Requirement 6.1
- All error messages must be in-page and non-blocking — never use `alert()` per the design

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "2.1"] },
    { "id": 1, "tasks": ["2.2", "2.3", "2.4", "2.5", "3.1", "3.3", "3.4", "3.6", "3.8", "3.10"] },
    { "id": 2, "tasks": ["3.2", "3.5", "3.7", "3.9", "3.11", "5.1", "5.2", "5.4", "5.6", "5.8", "5.10"] },
    { "id": 3, "tasks": ["5.3", "5.5", "5.7", "5.9", "5.11", "6.1"] },
    { "id": 4, "tasks": ["6.2", "6.3"] },
    { "id": 5, "tasks": ["8.1"] },
    { "id": 6, "tasks": ["8.2"] }
  ]
}
```
