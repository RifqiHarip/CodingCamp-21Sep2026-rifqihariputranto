# Requirements Document

## Introduction

The Expense and Budget Visualizer is a client-side web application that allows users to track personal expenses by category, view a running balance, and visualize spending distribution through an interactive pie chart. The application runs entirely in the browser using Vanilla JavaScript with no backend server. All data persists locally via the browser's Local Storage API. The app is structured with a single CSS file and a single JavaScript file for maintainability and simplicity.

## Glossary

- **App**: The Expense and Budget Visualizer web application.
- **Transaction**: A single expense entry consisting of an Item Name, Amount, and Category.
- **Transaction_List**: The scrollable UI component that displays all recorded transactions.
- **Input_Form**: The UI form component used to add new transactions.
- **Balance_Display**: The UI component at the top of the page showing the total balance derived from all transactions.
- **Pie_Chart**: The visual chart component displaying spending distribution by category.
- **Storage**: The browser's Local Storage API used to persist transaction data client-side.
- **Category**: A classification label for a transaction. Valid values are: Food, Transport, Fun.
- **Validator**: The client-side logic responsible for checking that all required input fields are filled before a transaction is submitted.

---

## Requirements

### Requirement 1: Input Form — Add a Transaction

**User Story:** As a user, I want to fill in an expense form with an item name, amount, and category, so that I can record a new transaction.

#### Acceptance Criteria

1. THE Input_Form SHALL provide a text field for Item Name accepting up to 100 characters, a numeric field for Amount accepting values between 0.01 and 999,999,999.99, and a dropdown selector for Category with exactly the following options: Food, Transport, and Fun.
2. WHEN the user submits the Input_Form, THE Validator SHALL check that the Item Name field is not empty, the Amount field contains a numeric value between 0.01 and 999,999,999.99, and a Category option has been selected.
3. IF the Validator detects that the Item Name field is empty or exceeds 100 characters, THEN THE Input_Form SHALL display an inline error message adjacent to the Item Name field indicating the violation and SHALL NOT add a transaction.
4. IF the Validator detects that the Amount field is empty, non-numeric, zero, or negative, THEN THE Input_Form SHALL display an inline error message adjacent to the Amount field indicating the violation and SHALL NOT add a transaction.
5. IF the Validator detects that no Category option has been selected, THEN THE Input_Form SHALL display an inline error message adjacent to the Category dropdown indicating the violation and SHALL NOT add a transaction.
6. WHEN all fields pass validation, THE App SHALL add a new Transaction to the Transaction_List and persist it to Storage within 2 seconds.
7. WHEN a Transaction is successfully added, THE Input_Form SHALL reset the Item Name field to empty, the Amount field to empty, and the Category dropdown to its default unselected state.

---

### Requirement 2: Transaction List — View and Delete Transactions

**User Story:** As a user, I want to see all my recorded expenses in a scrollable list and be able to delete any entry, so that I can review and manage my transaction history.

#### Acceptance Criteria

1. THE Transaction_List SHALL display all persisted transactions, each showing the Item Name (up to 100 characters), Amount (as a numeric value with up to 2 decimal places), and Category.
2. WHILE transactions exist in Storage, THE Transaction_List SHALL render each transaction as a distinct list item in chronological order of insertion (oldest first).
3. WHILE the total rendered height of Transaction_List items exceeds the visible height of the list container, THE Transaction_List SHALL be scrollable without requiring a page reload.
4. IF no transactions exist in Storage, THEN THE Transaction_List SHALL display a message indicating that no transactions have been recorded.
5. WHEN the user clicks the delete control on a Transaction, THE App SHALL remove that Transaction from the Transaction_List and from Storage.
6. IF the delete operation on Storage fails, THEN THE App SHALL display an error message indicating the deletion could not be completed and retain the Transaction in both the Transaction_List and Storage.
7. WHEN the user deletes a Transaction, THE App SHALL update the Balance_Display and Pie_Chart to reflect the removal of that Transaction within 1 second without requiring a page reload.

---

### Requirement 3: Total Balance Display

**User Story:** As a user, I want to see my total expenditure at the top of the page, so that I always know how much I have spent in total.

#### Acceptance Criteria

1. THE Balance_Display SHALL show the arithmetic sum of the Amount values of all Transactions currently in Storage, expressed as a numeric value rounded to two decimal places.
2. WHEN a new Transaction is added, THE Balance_Display SHALL update its displayed value to reflect the new total within 100ms of the addition.
3. WHEN a Transaction is deleted, THE Balance_Display SHALL update its displayed value to reflect the new total within 100ms of the deletion.
4. WHILE no transactions exist, THE Balance_Display SHALL show a value of zero.
5. IF one or more Transaction Amount values are negative, THEN THE Balance_Display SHALL show the signed arithmetic sum, where negative Amounts reduce the total.

---

### Requirement 4: Pie Chart — Spending Distribution by Category

**User Story:** As a user, I want to see a visual pie chart of my spending broken down by category, so that I can understand where my money is going.

#### Acceptance Criteria

1. THE Pie_Chart SHALL display each Category (Food, Transport, Fun) that has a total Amount greater than zero as a distinct segment, where each segment's size is proportional to that Category's total Amount relative to the sum of all displayed Category totals.
2. WHEN a Transaction is added or deleted, THE Pie_Chart SHALL re-render to reflect the updated category totals within 100ms of the change.
3. WHILE no transactions exist, THE Pie_Chart SHALL display a placeholder state consisting of a visible message indicating no spending data is available, with no chart segments rendered.
4. THE Pie_Chart SHALL include a legend or label identifying each displayed Category, its percentage of the total, and a unique color per segment such that no two segments share the same color.
5. WHERE the Chart.js library is included, THE App SHALL use Chart.js to render the Pie_Chart.

---

### Requirement 5: Data Persistence via Local Storage

**User Story:** As a user, I want my transaction data to be saved automatically, so that my records are not lost when I close or refresh the browser tab.

#### Acceptance Criteria

1. WHEN a Transaction is added, THE App SHALL serialize the current transaction list and write it to Storage under the key "transactions".
2. WHEN a Transaction is deleted, THE App SHALL serialize the updated transaction list and write it to Storage under the key "transactions".
3. WHEN the App initializes, THE App SHALL read the transaction list from Storage under the key "transactions" and restore all previously saved transactions into the Transaction_List, Balance_Display, and Pie_Chart within 500ms.
4. IF Storage is unavailable, THEN THE App SHALL initialize with an empty transaction list and display a non-blocking warning message in the Transaction_List area indicating that local storage is not available.
5. IF the value stored under the key "transactions" fails JSON parsing or is not a valid array, THEN THE App SHALL discard the corrupted data, overwrite Storage with an empty array under the same key, initialize with an empty transaction list, and display a non-blocking warning message in the Transaction_List area indicating that saved data could not be recovered.

---

### Requirement 6: Browser Compatibility and Project Structure

**User Story:** As a developer, I want the app to work across modern browsers and follow a clean, single-file structure, so that it is easy to maintain and deploy without any build tools.

#### Acceptance Criteria

1. THE App SHALL render all UI elements without JavaScript errors and with all styles applied in the latest stable versions of Chrome, Firefox, Edge, and Safari without requiring any browser extensions or polyfills beyond what the chosen chart library provides.
2. THE App SHALL be structured with exactly one HTML entry file at the project root, exactly one CSS file located in a `css/` directory relative to that HTML file, and exactly one JavaScript file located in a `js/` directory relative to that HTML file.
3. THE App SHALL use only HTML, CSS, and Vanilla JavaScript with no front-end frameworks such as React, Vue, or Angular.
4. IF the App is opened as a standalone HTML file directly in a browser without a backend server, THEN THE App SHALL load and display all features fully, with no feature depending on a network request to any backend server, except for initial loading of the chart library if sourced from an external CDN.

---

### Requirement 7: Performance and Visual Design

**User Story:** As a user, I want the interface to load quickly and respond immediately to my actions, so that I can record expenses without friction.

#### Acceptance Criteria

1. THE App SHALL render the initial page and restore all persisted data within 2 seconds on a standard desktop machine with a modern browser.
2. WHEN the user interacts with the Input_Form, Transaction_List, or Pie_Chart, THE App SHALL respond to each interaction within 100 milliseconds, with no layout shift or content repositioning visible to the user.
3. THE App SHALL apply a visual design where body text is at least 14px, heading text is at least 18px, all text and background color combinations meet a minimum contrast ratio of 4.5:1, and each Category in the Pie_Chart is assigned a visually distinct color such that no two adjacent segments share the same color.
4. THE App SHALL use a responsive layout so that the interface remains usable on screen widths between 320px and 1920px, with all interactive controls remaining fully visible and operable without horizontal scrolling at any width in that range.
5. IF the App fails to restore persisted data within 2 seconds of page load, THEN THE App SHALL display an error message indicating the data could not be loaded and render the interface in an empty initial state.
