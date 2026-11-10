/**
 * SpendWise - Dashboard Logic & Visualization
 */

let viewMode = 'monthly'; // 'monthly' | 'weekly'
let currentAnchorDate = new Date(); // Anchor for current time period
let settings = null;
let categories = [];
let transactions = [];
let budgets = { overall: 0, categories: {} };

let modalTxType = 'expense';

document.addEventListener('DOMContentLoaded', async () => {
  await loadAllData();
  setupNavTabs();
  setupPeriodControls();
  setupFilterControls();
  setupModalControls();
  setupSettingsAndBackup();
  renderDashboard();
});

async function loadAllData() {
  settings = await StorageManager.getSettings();
  categories = await StorageManager.getCategories();
  transactions = await StorageManager.getTransactions();
  budgets = await StorageManager.getBudgets();
}

function getPeriodRange(date, mode) {
  if (mode === 'monthly') {
    const year = date.getFullYear();
    const month = date.getMonth();
    const startDate = new Date(year, month, 1);
    const endDate = new Date(year, month + 1, 0, 23, 59, 59);
    const label = startDate.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
    return { startDate, endDate, label };
  } else {
    // Weekly (Starts Monday)
    const current = new Date(date);
    const day = current.getDay();
    const diffToMonday = current.getDate() - day + (day === 0 ? -6 : 1);
    const startOfWeek = new Date(current.setDate(diffToMonday));
    startOfWeek.setHours(0, 0, 0, 0);

    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(endOfWeek.getDate() + 6);
    endOfWeek.setHours(23, 59, 59, 999);

    const fmt = { month: 'short', day: 'numeric' };
    const label = `${startOfWeek.toLocaleDateString(undefined, fmt)} - ${endOfWeek.toLocaleDateString(undefined, fmt)}, ${endOfWeek.getFullYear()}`;
    return { startDate: startOfWeek, endDate: endOfWeek, label };
  }
}

function filterTransactionsForPeriod() {
  const { startDate, endDate } = getPeriodRange(currentAnchorDate, viewMode);
  return transactions.filter(t => {
    const tDate = new Date(t.date + 'T00:00:00');
    return tDate >= startDate && tDate <= endDate;
  });
}

function renderDashboard() {
  const { label } = getPeriodRange(currentAnchorDate, viewMode);
  document.getElementById('currentPeriodLabel').textContent = label;

  const sym = settings.currencySymbol || '$';
  const periodTxs = filterTransactionsForPeriod();

  // Sample banner check
  const hasSample = transactions.some(t => t.isSample);
  document.getElementById('dashSampleNotice').style.display = hasSample ? 'flex' : 'none';

  // Summaries
  let totalIncome = 0;
  let totalExpense = 0;
  const categoryExpenses = {};

  periodTxs.forEach(t => {
    const amt = Number(t.amount);
    if (t.type === 'income') {
      totalIncome += amt;
    } else if (t.type === 'expense') {
      totalExpense += amt;
      categoryExpenses[t.category] = (categoryExpenses[t.category] || 0) + amt;
    }
  });

  const netBalance = totalIncome - totalExpense;
  const overallLimit = budgets.overall || settings.overallMonthlyBudget || 0;
  const budgetLeft = overallLimit > 0 ? (overallLimit - totalExpense) : 0;

  // Render Metric Cards
  document.getElementById('dIncome').textContent = `${sym}${formatNum(totalIncome)}`;
  document.getElementById('dExpense').textContent = `${sym}${formatNum(totalExpense)}`;
  document.getElementById('dBalance').textContent = `${sym}${formatNum(netBalance)}`;
  document.getElementById('dBalance').style.color = netBalance >= 0 ? 'var(--primary)' : 'var(--danger)';

  if (overallLimit > 0) {
    document.getElementById('dBudgetLeft').textContent = `${sym}${formatNum(budgetLeft)}`;
    document.getElementById('dBudgetLeft').style.color = budgetLeft >= 0 ? 'var(--text-main)' : 'var(--danger)';
    document.getElementById('dBudgetCap').textContent = `Cap: ${sym}${formatNum(overallLimit)}`;

    const ratio = (totalExpense / overallLimit) * 100;
    const warningEl = document.getElementById('dashBudgetWarning');
    const warningText = document.getElementById('dashBudgetText');
    if (ratio >= 100) {
      warningEl.className = 'alert alert-danger';
      warningText.textContent = `🚨 Budget Exceeded: You have spent ${sym}${formatNum(totalExpense)} (${ratio.toFixed(0)}%) of your ${sym}${formatNum(overallLimit)} limit for this period.`;
      warningEl.style.display = 'flex';
    } else if (ratio >= 80) {
      warningEl.className = 'alert alert-warning';
      warningText.textContent = `⚠️ Gentle Warning: You are nearing your budget limit (${ratio.toFixed(0)}% spent: ${sym}${formatNum(totalExpense)} of ${sym}${formatNum(overallLimit)}).`;
      warningEl.style.display = 'flex';
    } else {
      warningEl.style.display = 'none';
    }
  } else {
    document.getElementById('dBudgetLeft').textContent = 'No Cap';
    document.getElementById('dBudgetCap').textContent = 'Set limit in Budgets tab';
    document.getElementById('dashBudgetWarning').style.display = 'none';
  }

  // Draw Accessible Donut Chart
  renderDonutChart(categoryExpenses, totalExpense, sym);

  // Render Budget Progress Snapshot
  renderBudgetSnapshot(categoryExpenses, sym);

  // Render Period Transactions in Overview Tab
  renderOverviewTable(periodTxs, sym);

  // Render Full Transactions Tab
  renderFullTransactionsTable();

  // Populate Categories Tab
  renderCategoryManagement();

  // Populate Budgets Tab Inputs
  populateBudgetTab();
}

function renderDonutChart(categoryExpenses, totalExpense, sym) {
  const canvas = document.getElementById('categoryDonutCanvas');
  const ctx = canvas.getContext('2d');
  const dpr = window.devicePixelRatio || 1;
  const size = 230;

  canvas.width = size * dpr;
  canvas.height = size * dpr;
  ctx.scale(dpr, dpr);
  ctx.clearRect(0, 0, size, size);

  document.getElementById('donutCenterTotal').textContent = `${sym}${formatNum(totalExpense)}`;

  const legendEl = document.getElementById('chartLegend');
  legendEl.innerHTML = '';

  const entries = Object.entries(categoryExpenses).filter(([_, amt]) => amt > 0);

  if (entries.length === 0) {
    // Draw empty grey ring
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, 85, 0, 2 * Math.PI);
    ctx.lineWidth = 28;
    ctx.strokeStyle = '#E5E7EB';
    ctx.stroke();

    legendEl.innerHTML = '<span class="text-xs text-muted">No expenses recorded for this period</span>';
    return;
  }

  // Map Category Details
  const catMap = {};
  categories.forEach(c => { catMap[c.id] = c; });

  let startAngle = -0.5 * Math.PI;

  entries.forEach(([catId, amount]) => {
    const cat = catMap[catId] || { name: 'Other', color: '#6B7280', icon: '📦' };
    const sliceAngle = (amount / totalExpense) * (2 * Math.PI);
    const endAngle = startAngle + sliceAngle;

    ctx.beginPath();
    ctx.arc(size / 2, size / 2, 85, startAngle, endAngle);
    ctx.lineWidth = 28;
    ctx.strokeStyle = cat.color || '#4F46E5';
    ctx.stroke();

    startAngle = endAngle;

    // Accessible Legend entry with label, value, and percent
    const percent = Math.round((amount / totalExpense) * 100);
    const legendItem = document.createElement('div');
    legendItem.className = 'legend-item';
    legendItem.innerHTML = `
      <span class="legend-color-dot" style="background:${cat.color || '#4F46E5'}"></span>
      <span>${cat.icon || ''} <strong>${cat.name}</strong>: ${sym}${formatNum(amount)} (${percent}%)</span>
    `;
    legendEl.appendChild(legendItem);
  });
}

function renderBudgetSnapshot(categoryExpenses, sym) {
  const container = document.getElementById('budgetProgressList');
  container.innerHTML = '';

  const catBudgets = budgets.categories || {};
  const catMap = {};
  categories.forEach(c => { catMap[c.id] = c; });

  const activeBudgetCatIds = Object.keys(catBudgets).filter(id => Number(catBudgets[id]) > 0);

  if (activeBudgetCatIds.length === 0) {
    container.innerHTML = `
      <div style="text-align: center; padding: 24px 10px; color: var(--text-muted); font-size: 0.85rem;">
        No category budgets configured yet.<br>
        <button class="btn btn-secondary btn-sm" style="margin-top: 10px;" id="btnGoToBudgets">Configure Budgets</button>
      </div>
    `;
    const btn = document.getElementById('btnGoToBudgets');
    if (btn) btn.addEventListener('click', () => switchTab('tab-budgets'));
    return;
  }

  activeBudgetCatIds.forEach(catId => {
    const cat = catMap[catId] || { name: 'Other', icon: '🏷️' };
    const limit = Number(catBudgets[catId]);
    const spent = Number(categoryExpenses[catId] || 0);
    const pct = Math.min(Math.round((spent / limit) * 100), 100);

    let barClass = 'progress-safe';
    let statusBadge = '';

    if (spent >= limit) {
      barClass = 'progress-danger';
      statusBadge = '<span class="badge badge-expense">Exceeded</span>';
    } else if (spent >= limit * 0.8) {
      barClass = 'progress-warning';
      statusBadge = '<span class="badge" style="background:#FEF3C7; color:#B45309;">Nearing Cap</span>';
    }

    const item = document.createElement('div');
    item.className = 'budget-item';
    item.innerHTML = `
      <div class="budget-meta">
        <span>${cat.icon} <strong>${cat.name}</strong> ${statusBadge}</span>
        <span>${sym}${formatNum(spent)} / ${sym}${formatNum(limit)} (${pct}%)</span>
      </div>
      <div class="budget-progress-container">
        <div class="budget-progress-bar ${barClass}" style="width: ${pct}%"></div>
      </div>
    `;
    container.appendChild(item);
  });
}

function renderOverviewTable(txs, sym) {
  const tbody = document.getElementById('overviewTableBody');
  tbody.innerHTML = '';
  document.getElementById('periodTxCount').textContent = `${txs.length} transactions`;

  if (txs.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding: 20px; color: var(--text-muted);">No transactions recorded for this period.</td></tr>`;
    return;
  }

  const catMap = {};
  categories.forEach(c => { catMap[c.id] = c; });

  const sorted = [...txs].sort((a, b) => new Date(b.date) - new Date(a.date));

  sorted.forEach(t => {
    const cat = catMap[t.category] || { name: 'Other', icon: '📦' };
    const isInc = t.type === 'income';

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${t.date}</td>
      <td><span>${cat.icon}</span> ${cat.name}</td>
      <td>${t.note || '-'} ${t.isRecurring ? '🔄' : ''} ${t.isSample ? '<span class="badge badge-sample">Sample</span>' : ''}</td>
      <td><span class="badge ${isInc ? 'badge-income' : 'badge-expense'}">${t.type}</span></td>
      <td style="text-align: right; font-weight: 600; color: ${isInc ? 'var(--success)' : 'var(--danger)'};">
        ${isInc ? '+' : '-'}${sym}${formatNum(t.amount)}
      </td>
      <td style="text-align: center;">
        <button class="btn btn-secondary btn-sm" onclick="editTransaction('${t.id}')">Edit</button>
        <button class="btn btn-danger btn-sm" onclick="deleteTransaction('${t.id}')">Delete</button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

function renderFullTransactionsTable() {
  const tbody = document.getElementById('fullTransactionsTableBody');
  tbody.innerHTML = '';

  const search = document.getElementById('filterSearch').value.toLowerCase();
  const typeFilter = document.getElementById('filterType').value;
  const catFilter = document.getElementById('filterCategory').value;
  const sym = settings.currencySymbol || '$';

  const catMap = {};
  categories.forEach(c => { catMap[c.id] = c; });

  const filtered = transactions.filter(t => {
    const cat = catMap[t.category] || { name: 'Other' };
    const matchesSearch = !search ||
      (t.note && t.note.toLowerCase().includes(search)) ||
      (cat.name && cat.name.toLowerCase().includes(search));
    const matchesType = typeFilter === 'all' || t.type === typeFilter;
    const matchesCat = catFilter === 'all' || t.category === catFilter;
    return matchesSearch && matchesType && matchesCat;
  });

  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding: 24px; color: var(--text-muted);">No transactions match your criteria.</td></tr>`;
    return;
  }

  filtered.sort((a, b) => new Date(b.date) - new Date(a.date));

  filtered.forEach(t => {
    const cat = catMap[t.category] || { name: 'Other', icon: '📦' };
    const isInc = t.type === 'income';

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${t.date}</td>
      <td><span class="badge ${isInc ? 'badge-income' : 'badge-expense'}">${t.type}</span></td>
      <td><span>${cat.icon}</span> ${cat.name}</td>
      <td>${t.note || '-'} ${t.isSample ? '<span class="badge badge-sample">Sample</span>' : ''}</td>
      <td>${t.isRecurring ? '🔄 Yes' : 'No'}</td>
      <td style="text-align: right; font-weight: 600; color: ${isInc ? 'var(--success)' : 'var(--danger)'};">
        ${isInc ? '+' : '-'}${sym}${formatNum(t.amount)}
      </td>
      <td style="text-align: center;">
        <button class="btn btn-secondary btn-sm" onclick="editTransaction('${t.id}')">Edit</button>
        <button class="btn btn-danger btn-sm" onclick="deleteTransaction('${t.id}')">Delete</button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

function renderCategoryManagement() {
  const container = document.getElementById('categoryManagementList');
  container.innerHTML = '';

  categories.forEach(cat => {
    const card = document.createElement('div');
    card.className = 'category-card';
    card.innerHTML = `
      <div style="display: flex; align-items: center; gap: 10px;">
        <div style="font-size: 1.5rem; width: 38px; height: 38px; border-radius: 50%; background: ${cat.color || '#4F46E5'}1A; display: flex; align-items: center; justify-content: center; color: ${cat.color || '#4F46E5'};">
          ${cat.icon}
        </div>
        <div>
          <div class="font-medium">${cat.name}</div>
          <div class="text-xs text-muted">${cat.type === 'income' ? 'Income' : 'Expense'} Category</div>
        </div>
      </div>
      <div>
        <button class="btn btn-secondary btn-sm" onclick="editCategory('${cat.id}')">Edit</button>
      </div>
    `;
    container.appendChild(card);
  });

  // Populate category filter dropdown in Transactions tab
  const filterCatSelect = document.getElementById('filterCategory');
  filterCatSelect.innerHTML = '<option value="all">All Categories</option>';
  categories.forEach(c => {
    const opt = document.createElement('option');
    opt.value = c.id;
    opt.textContent = `${c.icon} ${c.name}`;
    filterCatSelect.appendChild(opt);
  });
}

function populateBudgetTab() {
  const sym = settings.currencySymbol || '$';
  document.getElementById('budgetOverallSymbol').textContent = sym;
  document.getElementById('inputOverallBudget').value = budgets.overall || settings.overallMonthlyBudget || '';

  const container = document.getElementById('categoryBudgetInputs');
  container.innerHTML = '';

  const expenseCategories = categories.filter(c => c.type !== 'income');
  expenseCategories.forEach(cat => {
    const curVal = (budgets.categories && budgets.categories[cat.id]) ? budgets.categories[cat.id] : '';
    const row = document.createElement('div');
    row.className = 'form-group';
    row.innerHTML = `
      <label class="form-label">${cat.icon} ${cat.name}</label>
      <div class="input-with-symbol">
        <span class="currency-addon">${sym}</span>
        <input type="number" step="1" min="0" name="cat_budget_${cat.id}" class="form-input" data-cat-id="${cat.id}" value="${curVal}" placeholder="No limit">
      </div>
    `;
    container.appendChild(row);
  });
}

// Global actions exposed to window for inline onclick attributes
window.deleteTransaction = async function(id) {
  if (confirm('Are you sure you want to delete this transaction? This action cannot be undone.')) {
    await StorageManager.deleteTransaction(id);
    await loadAllData();
    renderDashboard();
  }
};

window.editTransaction = function(id) {
  const tx = transactions.find(t => t.id === id);
  if (!tx) return;

  document.getElementById('txModalTitle').textContent = 'Edit Transaction';
  document.getElementById('modalTxId').value = tx.id;
  document.getElementById('modalTxAmount').value = tx.amount;
  document.getElementById('modalTxDate').value = tx.date;
  document.getElementById('modalTxNote').value = tx.note || '';
  document.getElementById('modalTxRecurring').checked = !!tx.isRecurring;

  setModalType(tx.type);
  populateModalCategoryOptions(tx.type, tx.category);

  document.getElementById('txModal').style.display = 'flex';
};

window.editCategory = function(id) {
  const cat = categories.find(c => c.id === id);
  if (!cat) return;

  document.getElementById('catModalTitle').textContent = 'Edit Category';
  document.getElementById('modalCatId').value = cat.id;
  document.getElementById('modalCatName').value = cat.name;
  document.getElementById('modalCatIcon').value = cat.icon;
  document.getElementById('modalCatColor').value = cat.color || '#4F46E5';
  document.getElementById('modalCatType').value = cat.type || 'expense';

  document.getElementById('categoryModal').style.display = 'flex';
};

function setupNavTabs() {
  document.querySelectorAll('.nav-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      switchTab(tab.dataset.tab);
    });
  });

  const linkToBudgets = document.getElementById('linkToBudgets');
  if (linkToBudgets) {
    linkToBudgets.addEventListener('click', (e) => {
      e.preventDefault();
      switchTab('tab-budgets');
    });
  }
}

function switchTab(tabId) {
  document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.tab-pane').forEach(p => p.style.display = 'none');

  const activeTab = document.querySelector(`.nav-tab[data-tab="${tabId}"]`);
  if (activeTab) activeTab.classList.add('active');

  const activePane = document.getElementById(tabId);
  if (activePane) activePane.style.display = 'block';
}

function setupPeriodControls() {
  const btnMonthly = document.getElementById('btnViewMonthly');
  const btnWeekly = document.getElementById('btnViewWeekly');
  const btnPrev = document.getElementById('btnPrevPeriod');
  const btnNext = document.getElementById('btnNextPeriod');

  btnMonthly.addEventListener('click', () => {
    viewMode = 'monthly';
    btnMonthly.classList.add('active');
    btnWeekly.classList.remove('active');
    renderDashboard();
  });

  btnWeekly.addEventListener('click', () => {
    viewMode = 'weekly';
    btnWeekly.classList.add('active');
    btnMonthly.classList.remove('active');
    renderDashboard();
  });

  btnPrev.addEventListener('click', () => {
    if (viewMode === 'monthly') {
      currentAnchorDate.setMonth(currentAnchorDate.getMonth() - 1);
    } else {
      currentAnchorDate.setDate(currentAnchorDate.getDate() - 7);
    }
    renderDashboard();
  });

  btnNext.addEventListener('click', () => {
    if (viewMode === 'monthly') {
      currentAnchorDate.setMonth(currentAnchorDate.getMonth() + 1);
    } else {
      currentAnchorDate.setDate(currentAnchorDate.getDate() + 7);
    }
    renderDashboard();
  });
}

function setupFilterControls() {
  document.getElementById('filterSearch').addEventListener('input', renderFullTransactionsTable);
  document.getElementById('filterType').addEventListener('change', renderFullTransactionsTable);
  document.getElementById('filterCategory').addEventListener('change', renderFullTransactionsTable);
  document.getElementById('btnResetFilters').addEventListener('click', () => {
    document.getElementById('filterSearch').value = '';
    document.getElementById('filterType').value = 'all';
    document.getElementById('filterCategory').value = 'all';
    renderFullTransactionsTable();
  });

  document.getElementById('btnExportCsv').addEventListener('click', downloadCsvFile);
  document.getElementById('btnDownloadCsv2').addEventListener('click', downloadCsvFile);
}

async function downloadCsvFile() {
  const csv = await StorageManager.exportCsv();
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `SpendWise_Export_${new Date().toISOString().split('T')[0]}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

function setupModalControls() {
  const txModal = document.getElementById('txModal');
  const catModal = document.getElementById('categoryModal');

  // Open add transaction modal
  const openNewTx = () => {
    document.getElementById('txModalTitle').textContent = 'Add Transaction';
    document.getElementById('modalTxId').value = '';
    document.getElementById('modalTxAmount').value = '';
    document.getElementById('modalTxDate').value = new Date().toISOString().split('T')[0];
    document.getElementById('modalTxNote').value = '';
    document.getElementById('modalTxRecurring').checked = false;
    setModalType('expense');
    populateModalCategoryOptions('expense');
    txModal.style.display = 'flex';
  };

  document.getElementById('btnQuickAddModal').addEventListener('click', openNewTx);
  document.getElementById('btnNewTxTab').addEventListener('click', openNewTx);

  document.getElementById('btnCloseTxModal').addEventListener('click', () => txModal.style.display = 'none');
  document.getElementById('btnCancelTxModal').addEventListener('click', () => txModal.style.display = 'none');

  // Open add category modal
  document.getElementById('btnOpenNewCategoryModal').addEventListener('click', () => {
    document.getElementById('catModalTitle').textContent = 'Create New Category';
    document.getElementById('modalCatId').value = '';
    document.getElementById('modalCatName').value = '';
    document.getElementById('modalCatIcon').value = '🏷️';
    document.getElementById('modalCatColor').value = '#4F46E5';
    document.getElementById('modalCatType').value = 'expense';
    catModal.style.display = 'flex';
  });

  document.getElementById('btnCloseCatModal').addEventListener('click', () => catModal.style.display = 'none');
  document.getElementById('btnCancelCatModal').addEventListener('click', () => catModal.style.display = 'none');

  // Modal type switches
  const modalTabExpense = document.getElementById('modalTabExpense');
  const modalTabIncome = document.getElementById('modalTabIncome');

  modalTabExpense.addEventListener('click', () => {
    setModalType('expense');
    populateModalCategoryOptions('expense');
  });

  modalTabIncome.addEventListener('click', () => {
    setModalType('income');
    populateModalCategoryOptions('income');
  });

  // Submit Transaction Form
  document.getElementById('modalTxForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('modalTxId').value;
    const amount = parseFloat(document.getElementById('modalTxAmount').value);
    const date = document.getElementById('modalTxDate').value;
    const category = document.getElementById('modalTxCategory').value;
    const note = document.getElementById('modalTxNote').value.trim();
    const isRecurring = document.getElementById('modalTxRecurring').checked;

    if (!amount || amount <= 0) {
      alert('Please enter a valid amount.');
      return;
    }

    if (id) {
      await StorageManager.updateTransaction(id, {
        type: modalTxType,
        amount,
        date,
        category,
        note,
        isRecurring
      });
    } else {
      await StorageManager.addTransaction({
        type: modalTxType,
        amount,
        date,
        category,
        note,
        isRecurring,
        isSample: false
      });
    }

    txModal.style.display = 'none';
    await loadAllData();
    renderDashboard();
  });

  // Submit Category Form
  document.getElementById('modalCategoryForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('modalCatId').value;
    const name = document.getElementById('modalCatName').value.trim();
    const icon = document.getElementById('modalCatIcon').value.trim() || '🏷️';
    const color = document.getElementById('modalCatColor').value;
    const type = document.getElementById('modalCatType').value;

    if (!name) {
      alert('Please enter a category name.');
      return;
    }

    let catList = await StorageManager.getCategories();

    if (id) {
      const idx = catList.findIndex(c => c.id === id);
      if (idx !== -1) {
        catList[idx] = { ...catList[idx], name, icon, color, type };
      }
    } else {
      const newCat = {
        id: 'cat_custom_' + Date.now(),
        name,
        icon,
        color,
        type,
        isSystem: false
      };
      catList.push(newCat);
    }

    await StorageManager.saveCategories(catList);
    catModal.style.display = 'none';
    await loadAllData();
    renderDashboard();
  });

  // Overall budget form submit
  document.getElementById('overallBudgetForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const val = parseFloat(document.getElementById('inputOverallBudget').value) || 0;
    budgets.overall = val;
    await StorageManager.saveBudgets(budgets);

    settings.overallMonthlyBudget = val;
    await StorageManager.saveSettings(settings);

    alert('Overall budget updated successfully.');
    renderDashboard();
  });

  // Category budgets form submit
  document.getElementById('categoryBudgetsForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const inputs = document.querySelectorAll('#categoryBudgetInputs input');
    budgets.categories = budgets.categories || {};

    inputs.forEach(input => {
      const catId = input.dataset.catId;
      const num = parseFloat(input.value);
      if (num > 0) {
        budgets.categories[catId] = num;
      } else {
        delete budgets.categories[catId];
      }
    });

    await StorageManager.saveBudgets(budgets);
    alert('Category budgets saved successfully.');
    renderDashboard();
  });
}

function setModalType(type) {
  modalTxType = type;
  const tabExpense = document.getElementById('modalTabExpense');
  const tabIncome = document.getElementById('modalTabIncome');
  const saveBtn = document.getElementById('btnSaveTxModal');

  if (type === 'expense') {
    tabExpense.className = 'type-toggle-btn active expense';
    tabIncome.className = 'type-toggle-btn';
    saveBtn.className = 'btn btn-primary';
  } else {
    tabIncome.className = 'type-toggle-btn active income';
    tabExpense.className = 'type-toggle-btn';
    saveBtn.className = 'btn btn-primary';
    saveBtn.style.background = 'var(--success)';
  }
}

function populateModalCategoryOptions(type, selectedCatId = null) {
  const select = document.getElementById('modalTxCategory');
  select.innerHTML = '';

  const relevant = categories.filter(c => {
    if (type === 'income') return c.type === 'income' || c.id === 'cat_other';
    return c.type !== 'income';
  });

  relevant.forEach(c => {
    const opt = document.createElement('option');
    opt.value = c.id;
    opt.textContent = `${c.icon} ${c.name}`;
    if (selectedCatId && selectedCatId === c.id) {
      opt.selected = true;
    }
    select.appendChild(opt);
  });
}

function setupSettingsAndBackup() {
  // Clear sample button
  const btnClearSample = document.getElementById('dashBtnClearSample');
  btnClearSample.addEventListener('click', async () => {
    if (confirm('Clear all sample transactions? Your real transactions will remain untouched.')) {
      await StorageManager.removeSampleData();
      await loadAllData();
      renderDashboard();
    }
  });

  // Currency preference
  document.getElementById('settingsCurrency').value = settings.currency || 'USD';
  document.getElementById('btnSaveCurrency').addEventListener('click', async () => {
    const curr = document.getElementById('settingsCurrency').value;
    settings.currency = curr;
    settings.currencySymbol = window.CURRENCY_SYMBOLS[curr] || '$';
    await StorageManager.saveSettings(settings);
    alert(`Currency changed to ${curr} (${settings.currencySymbol})`);
    renderDashboard();
  });

  // Export JSON backup
  document.getElementById('btnDownloadBackup').addEventListener('click', async () => {
    const json = await StorageManager.exportJsonBackup();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `SpendWise_Backup_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  });

  // Import JSON backup
  document.getElementById('fileRestore').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (confirm('Restoring this backup will replace current settings, categories, budgets, and transactions. Continue?')) {
      const reader = new FileReader();
      reader.onload = async (evt) => {
        try {
          await StorageManager.importJsonBackup(evt.target.result);
          alert('Backup restored successfully!');
          await loadAllData();
          renderDashboard();
        } catch (err) {
          alert('Failed to parse backup file: ' + err.message);
        }
      };
      reader.readAsText(file);
    }
    e.target.value = '';
  });

  // Load sample data button in settings
  document.getElementById('btnLoadSampleDataDash').addEventListener('click', async () => {
    await StorageManager.loadSampleData();
    await loadAllData();
    renderDashboard();
    alert('Sample transactions and starter budgets loaded!');
  });

  // Reset all data
  document.getElementById('btnClearAllData').addEventListener('click', async () => {
    if (confirm('⚠️ WARNING: This will permanently delete ALL data, categories, transactions, and budgets. Are you completely sure?')) {
      await StorageManager.clearAllData();
      alert('All local data cleared.');
      location.reload();
    }
  });
}

function formatNum(num) {
  return Number(num).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
