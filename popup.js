/**
 * SpendWise - Popup Logic
 */

let currentType = 'expense';
let currentSettings = null;
let currentCategories = [];
let currentTransactions = [];

document.addEventListener('DOMContentLoaded', async () => {
  await initPopup();
});

async function initPopup() {
  currentSettings = await StorageManager.getSettings();
  currentCategories = await StorageManager.getCategories();
  currentTransactions = await StorageManager.getTransactions();

  if (!currentSettings.isConfigured && currentTransactions.length === 0) {
    showOnboarding();
  } else {
    showMain();
  }

  setupEventListeners();
}

function showOnboarding() {
  document.getElementById('onboardingScreen').style.display = 'block';
  document.getElementById('mainScreen').style.display = 'none';

  const currencySelect = document.getElementById('onboardCurrency');
  currencySelect.addEventListener('change', (e) => {
    const symbol = window.CURRENCY_SYMBOLS[e.target.value] || '$';
    document.getElementById('onboardCurrencySymbol').textContent = symbol;
    document.getElementById('onboardBudgetSymbol').textContent = symbol;
  });
}

function showMain() {
  document.getElementById('onboardingScreen').style.display = 'none';
  document.getElementById('mainScreen').style.display = 'block';

  document.getElementById('entryCurrencySymbol').textContent = currentSettings.currencySymbol || '$';
  document.getElementById('txDate').value = new Date().toISOString().split('T')[0];

  renderCategoryChips();
  renderSummaryAndActivity();
}

function renderCategoryChips() {
  const container = document.getElementById('categoryChips');
  container.innerHTML = '';

  const relevantCats = currentCategories.filter(c => {
    if (currentType === 'income') {
      return c.type === 'income' || c.id === 'cat_other';
    } else {
      return c.type !== 'income';
    }
  });

  const hiddenInput = document.getElementById('txCategory');
  hiddenInput.value = relevantCats.length > 0 ? relevantCats[0].id : '';

  relevantCats.forEach((cat, idx) => {
    const chip = document.createElement('div');
    chip.className = `category-chip ${idx === 0 ? 'selected' : ''}`;
    chip.innerHTML = `<span>${cat.icon || '🏷️'}</span><span>${cat.name}</span>`;
    chip.dataset.id = cat.id;

    chip.addEventListener('click', () => {
      document.querySelectorAll('.category-chip').forEach(c => c.classList.remove('selected'));
      chip.classList.add('selected');
      hiddenInput.value = cat.id;
    });

    container.appendChild(chip);
  });
}

async function renderSummaryAndActivity() {
  currentTransactions = await StorageManager.getTransactions();
  currentSettings = await StorageManager.getSettings();
  const budgets = await StorageManager.getBudgets();

  const sym = currentSettings.currencySymbol || '$';

  // Sample banner check
  const sampleNotice = document.getElementById('sampleNotice');
  const hasSample = currentTransactions.some(t => t.isSample);
  sampleNotice.style.display = hasSample ? 'flex' : 'none';

  // Calculate Current Month Totals
  const now = new Date();
  const currentYearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  let totalIncome = 0;
  let totalExpense = 0;

  currentTransactions.forEach(t => {
    if (t.date.startsWith(currentYearMonth)) {
      if (t.type === 'income') totalIncome += Number(t.amount);
      if (t.type === 'expense') totalExpense += Number(t.amount);
    }
  });

  const balance = totalIncome - totalExpense;

  document.getElementById('sumIncome').textContent = `${sym}${totalIncome.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  document.getElementById('sumExpense').textContent = `${sym}${totalExpense.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  document.getElementById('sumBalance').textContent = `${sym}${balance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  // Budget warning check
  const warningEl = document.getElementById('budgetWarning');
  const warningText = document.getElementById('budgetWarningText');
  const overallBudget = budgets.overall || currentSettings.overallMonthlyBudget || 0;

  if (overallBudget > 0) {
    const ratio = (totalExpense / overallBudget) * 100;
    if (ratio >= 100) {
      warningEl.className = 'alert alert-danger';
      warningText.textContent = `🚨 Budget exceeded! You have spent ${ratio.toFixed(0)}% of your ${sym}${overallBudget} monthly limit.`;
      warningEl.style.display = 'flex';
    } else if (ratio >= 80) {
      warningEl.className = 'alert alert-warning';
      warningText.textContent = `⚠️ Caution: You have used ${ratio.toFixed(0)}% of your monthly budget (${sym}${totalExpense.toFixed(2)} of ${sym}${overallBudget}).`;
      warningEl.style.display = 'flex';
    } else {
      warningEl.style.display = 'none';
    }
  } else {
    warningEl.style.display = 'none';
  }

  // Render recent 5 transactions
  const listEl = document.getElementById('recentTxList');
  listEl.innerHTML = '';

  const recent = [...currentTransactions]
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, 5);

  if (recent.length === 0) {
    listEl.innerHTML = `
      <div style="text-align: center; padding: 18px; color: var(--text-muted); font-size: 0.85rem; background: #fff; border-radius: var(--radius-sm); border: 1px dashed var(--border);">
        No transactions recorded yet.<br>Add your first one above!
      </div>
    `;
    return;
  }

  const catMap = {};
  currentCategories.forEach(c => { catMap[c.id] = c; });

  recent.forEach(tx => {
    const cat = catMap[tx.category] || { name: 'Other', icon: '📦' };
    const isInc = tx.type === 'income';

    const item = document.createElement('div');
    item.className = 'tx-item';
    item.innerHTML = `
      <div class="tx-left">
        <div class="tx-icon">${cat.icon || '🏷️'}</div>
        <div class="tx-details">
          <div class="tx-title">${cat.name} ${tx.isRecurring ? '🔄' : ''} ${tx.isSample ? '<span class="badge badge-sample">Sample</span>' : ''}</div>
          <div class="tx-sub">${tx.note ? tx.note + ' • ' : ''}${tx.date}</div>
        </div>
      </div>
      <div class="tx-amount ${isInc ? 'income' : 'expense'}">
        ${isInc ? '+' : '-'}${sym}${Number(tx.amount).toFixed(2)}
      </div>
    `;
    listEl.appendChild(item);
  });
}

function setupEventListeners() {
  // Onboarding submit
  const onboardForm = document.getElementById('onboardingForm');
  if (onboardForm) {
    onboardForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const curr = document.getElementById('onboardCurrency').value;
      const initialInc = parseFloat(document.getElementById('onboardIncome').value) || 0;
      const budget = parseFloat(document.getElementById('onboardBudget').value) || 0;
      const sym = window.CURRENCY_SYMBOLS[curr] || '$';

      const settings = await StorageManager.getSettings();
      settings.isConfigured = true;
      settings.currency = curr;
      settings.currencySymbol = sym;
      settings.overallMonthlyBudget = budget;
      await StorageManager.saveSettings(settings);

      if (budget > 0) {
        const budgets = await StorageManager.getBudgets();
        budgets.overall = budget;
        await StorageManager.saveBudgets(budgets);
      }

      if (initialInc > 0) {
        await StorageManager.addTransaction({
          type: 'income',
          amount: initialInc,
          category: 'cat_income_salary',
          date: new Date().toISOString().split('T')[0],
          note: 'Starting Balance / Income',
          isRecurring: false,
          isSample: false
        });
      }

      currentSettings = settings;
      showMain();
    });
  }

  // Sample data button on onboarding
  const btnSample = document.getElementById('btnLoadSampleData');
  if (btnSample) {
    btnSample.addEventListener('click', async () => {
      await StorageManager.loadSampleData();
      currentSettings = await StorageManager.getSettings();
      showMain();
    });
  }

  // Clear sample button
  const btnClearSample = document.getElementById('btnClearSample');
  if (btnClearSample) {
    btnClearSample.addEventListener('click', async () => {
      if (confirm('Remove all sample preview transactions? Your custom entered transactions will be preserved.')) {
        await StorageManager.removeSampleData();
        await renderSummaryAndActivity();
      }
    });
  }

  // Type Toggle (Expense / Income)
  const tabExpense = document.getElementById('tabExpense');
  const tabIncome = document.getElementById('tabIncome');
  const btnSubmitTx = document.getElementById('btnSubmitTx');

  tabExpense.addEventListener('click', () => {
    currentType = 'expense';
    tabExpense.className = 'type-toggle-btn active expense';
    tabIncome.className = 'type-toggle-btn';
    btnSubmitTx.textContent = '+ Add Expense';
    btnSubmitTx.className = 'btn btn-primary';
    renderCategoryChips();
  });

  tabIncome.addEventListener('click', () => {
    currentType = 'income';
    tabIncome.className = 'type-toggle-btn active income';
    tabExpense.className = 'type-toggle-btn';
    btnSubmitTx.textContent = '+ Add Income';
    btnSubmitTx.className = 'btn btn-primary';
    btnSubmitTx.style.background = 'var(--success)';
    renderCategoryChips();
  });

  // Add Transaction Form
  const txForm = document.getElementById('txForm');
  txForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const amount = parseFloat(document.getElementById('txAmount').value);
    const date = document.getElementById('txDate').value;
    const category = document.getElementById('txCategory').value;
    const note = document.getElementById('txNote').value.trim();
    const isRecurring = document.getElementById('txRecurring').checked;

    if (!amount || amount <= 0) {
      alert('Please enter a valid amount.');
      return;
    }

    await StorageManager.addTransaction({
      type: currentType,
      amount,
      date,
      category,
      note,
      isRecurring,
      isSample: false
    });

    document.getElementById('txAmount').value = '';
    document.getElementById('txNote').value = '';
    document.getElementById('txRecurring').checked = false;

    await renderSummaryAndActivity();
  });

  // Open Full Dashboard button
  const btnDash = document.getElementById('btnOpenDashboard');
  btnDash.addEventListener('click', () => {
    if (typeof chrome !== 'undefined' && chrome.tabs && chrome.runtime) {
      chrome.tabs.create({ url: chrome.runtime.getURL('dashboard.html') });
    } else {
      window.open('dashboard.html', '_blank');
    }
  });
}
