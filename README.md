# SpendWise — Personal Expense Tracker Extension

**SpendWise** is a lightweight, privacy-focused browser extension for tracking daily expenses, logging recurring and one-off income, managing category budgets, and visualizing spending patterns.

---

## 🚀 Key Features

1. **Guided Onboarding**
   - On first launch, prompts users to set their preferred currency (USD, EUR, GBP, INR, CAD, AUD, JPY, CHF, etc.) and starting balance / initial income.
   - Quick one-click option to load realistic preview sample data.

2. **Quick & Frictionless Data Entry**
   - Compact popup view designed specifically for Chrome Extension dimensions (380px wide).
   - Fast toggle between **Expense** and **Income**.
   - Horizontal category chip selector with starter categories: Housing, Food & Dining, Transport, Shopping, Bills & Utilities, Health & Wellness, Entertainment, and Other.
   - Optional note description and recurring transaction switch (monthly rent, salary, subscriptions).

3. **Monthly & Weekly Visual Dashboard**
   - **Accessible Donut Chart**: Canvas-rendered category breakdown with color-coded badges, percentage breakdowns, and exact currency amounts.
   - **Period Switcher**: Seamlessly toggle between monthly and weekly periods, navigating backward or forward in time.
   - **Financial Health Summary**: Real-time totals for Income, Expenses, Remaining Balance, and Remaining Budget Cap.

4. **Budgets & Gentle Warning Alerts**
   - Overall monthly spending limit plus per-category spending limits.
   - Dynamic progress bars with clear color feedback:
     - **Green (Safe)**: Under 80% of budget.
     - **Amber (Approaching)**: 80% to 99% of budget.
     - **Red (Exceeded)**: 100%+ spent with an alert banner.

5. **Category Customization**
   - Create new categories with custom icons (emojis), colors, and types (expense or income).
   - Edit existing category names and color tags.

6. **Privacy & Data Portability**
   - **100% Local Storage**: Saved in `chrome.storage.local` (or browser `localStorage` in standalone mode). No servers, no tracking, no external APIs.
   - **CSV Export**: Download formatted transaction ledger.
   - **Full JSON Backup & Restore**: One-click export and import of your entire state.
   - **Sample Data Isolation**: Sample preview data is explicitly flagged with `isSample: true` and can be wiped with one click without affecting real user transactions.

---

## 🛠️ How to Load as a Chrome Extension

1. Open Google Chrome (or Microsoft Edge / Brave).
2. Navigate to `chrome://extensions`.
3. Enable **Developer mode** toggle in the top-right corner.
4. Click **Load unpacked**.
5. Select the folder:
   `C:\Users\hites\.gemini\antigravity\scratch\expense-tracker-extension`
6. Pin **SpendWise** to your extension toolbar!

---

## 🌐 Instant Browser Preview

To test both the popup and full dashboard side-by-side in any web browser without installing:
- Open [`index.html`](file:///C:/Users/hites/.gemini/antigravity/scratch/expense-tracker-extension/index.html) in your browser.
