/**
 * SpendWise - Core Storage & Data Management Module
 * Supports chrome.storage.local with fallback to localStorage for web preview / dashboard testing.
 */

const STORAGE_KEYS = {
  TRANSACTIONS: 'spendwise_transactions',
  CATEGORIES: 'spendwise_categories',
  BUDGETS: 'spendwise_budgets',
  SETTINGS: 'spendwise_settings'
};

const DEFAULT_CATEGORIES = [
  { id: 'cat_housing', name: 'Housing', icon: '🏠', color: '#4F46E5', isSystem: true },
  { id: 'cat_food', name: 'Food & Dining', icon: '🍔', color: '#10B981', isSystem: true },
  { id: 'cat_transport', name: 'Transport', icon: '🚗', color: '#3B82F6', isSystem: true },
  { id: 'cat_shopping', name: 'Shopping', icon: '🛍️', color: '#EC4899', isSystem: true },
  { id: 'cat_bills', name: 'Bills & Utilities', icon: '💡', color: '#F59E0B', isSystem: true },
  { id: 'cat_health', name: 'Health & Wellness', icon: '🩺', color: '#EF4444', isSystem: true },
  { id: 'cat_entertainment', name: 'Entertainment', icon: '🎬', color: '#8B5CF6', isSystem: true },
  { id: 'cat_income_salary', name: 'Salary', icon: '💼', color: '#059669', isSystem: true, type: 'income' },
  { id: 'cat_income_freelance', name: 'Freelance', icon: '💻', color: '#0284C7', isSystem: true, type: 'income' },
  { id: 'cat_income_other', name: 'Other Income', icon: '💰', color: '#14B8A6', isSystem: true, type: 'income' },
  { id: 'cat_other', name: 'Other', icon: '📦', color: '#6B7280', isSystem: true }
];

const DEFAULT_SETTINGS = {
  isConfigured: false,
  currency: 'USD',
  currencySymbol: '$',
  overallMonthlyBudget: 0,
  hasSampleData: false,
  storageNote: 'All data is stored purely locally on your device via Chrome Extension Storage / LocalStorage.'
};

const SAMPLE_TRANSACTIONS = [
  {
    id: 'tx_s1',
    type: 'income',
    amount: 3800,
    category: 'cat_income_salary',
    date: new Date(Date.now() - 6 * 86400000).toISOString().split('T')[0],
    note: 'Primary Monthly Salary',
    isRecurring: true,
    isSample: true
  },
  {
    id: 'tx_s2',
    type: 'income',
    amount: 650,
    category: 'cat_income_freelance',
    date: new Date(Date.now() - 3 * 86400000).toISOString().split('T')[0],
    note: 'UI Design consulting project',
    isRecurring: false,
    isSample: true
  },
  {
    id: 'tx_s3',
    type: 'expense',
    amount: 1200,
    category: 'cat_housing',
    date: new Date(Date.now() - 5 * 86400000).toISOString().split('T')[0],
    note: 'Apartment Rent',
    isRecurring: true,
    isSample: true
  },
  {
    id: 'tx_s4',
    type: 'expense',
    amount: 145.50,
    category: 'cat_food',
    date: new Date(Date.now() - 4 * 86400000).toISOString().split('T')[0],
    note: 'Weekly Grocery Stockup',
    isRecurring: false,
    isSample: true
  },
  {
    id: 'tx_s5',
    type: 'expense',
    amount: 45.00,
    category: 'cat_transport',
    date: new Date(Date.now() - 3 * 86400000).toISOString().split('T')[0],
    note: 'Metro card & rideshare',
    isRecurring: false,
    isSample: true
  },
  {
    id: 'tx_s6',
    type: 'expense',
    amount: 85.00,
    category: 'cat_bills',
    date: new Date(Date.now() - 2 * 86400000).toISOString().split('T')[0],
    note: 'High-speed Fiber Internet',
    isRecurring: true,
    isSample: true
  },
  {
    id: 'tx_s7',
    type: 'expense',
    amount: 110.00,
    category: 'cat_shopping',
    date: new Date(Date.now() - 2 * 86400000).toISOString().split('T')[0],
    note: 'Running shoes & athletic socks',
    isRecurring: false,
    isSample: true
  },
  {
    id: 'tx_s8',
    type: 'expense',
    amount: 32.50,
    category: 'cat_entertainment',
    date: new Date(Date.now() - 1 * 86400000).toISOString().split('T')[0],
    note: 'Cinema tickets with friends',
    isRecurring: false,
    isSample: true
  },
  {
    id: 'tx_s9',
    type: 'expense',
    amount: 50.00,
    category: 'cat_health',
    date: new Date().toISOString().split('T')[0],
    note: 'Gym monthly pass',
    isRecurring: true,
    isSample: true
  }
];

const SAMPLE_BUDGETS = {
  overall: 2000,
  categories: {
    cat_housing: 1300,
    cat_food: 400,
    cat_transport: 120,
    cat_bills: 150,
    cat_shopping: 200,
    cat_entertainment: 100,
    cat_health: 80
  }
};

const StorageManager = {
  isExtension: typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local,

  async get(key, defaultValue = null) {
    if (this.isExtension) {
      return new Promise((resolve) => {
        chrome.storage.local.get([key], (result) => {
          if (result && result[key] !== undefined) {
            resolve(result[key]);
          } else {
            resolve(defaultValue);
          }
        });
      });
    } else {
      const val = localStorage.getItem(key);
      try {
        return val ? JSON.parse(val) : defaultValue;
      } catch (e) {
        return defaultValue;
      }
    }
  },

  async set(key, value) {
    if (this.isExtension) {
      return new Promise((resolve) => {
        chrome.storage.local.set({ [key]: value }, () => resolve(true));
      });
    } else {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    }
  },

  async getSettings() {
    const settings = await this.get(STORAGE_KEYS.SETTINGS, DEFAULT_SETTINGS);
    return { ...DEFAULT_SETTINGS, ...settings };
  },

  async saveSettings(settings) {
    return this.set(STORAGE_KEYS.SETTINGS, settings);
  },

  async getCategories() {
    const categories = await this.get(STORAGE_KEYS.CATEGORIES, null);
    if (!categories || categories.length === 0) {
      await this.set(STORAGE_KEYS.CATEGORIES, DEFAULT_CATEGORIES);
      return DEFAULT_CATEGORIES;
    }
    return categories;
  },

  async saveCategories(categories) {
    return this.set(STORAGE_KEYS.CATEGORIES, categories);
  },

  async getBudgets() {
    return await this.get(STORAGE_KEYS.BUDGETS, { overall: 0, categories: {} });
  },

  async saveBudgets(budgets) {
    return this.set(STORAGE_KEYS.BUDGETS, budgets);
  },

  async getTransactions() {
    return await this.get(STORAGE_KEYS.TRANSACTIONS, []);
  },

  async saveTransactions(transactions) {
    return this.set(STORAGE_KEYS.TRANSACTIONS, transactions);
  },

  async addTransaction(tx) {
    const list = await this.getTransactions();
    const newTx = {
      id: 'tx_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
      date: new Date().toISOString().split('T')[0],
      isRecurring: false,
      isSample: false,
      ...tx
    };
    list.unshift(newTx);
    await this.saveTransactions(list);
    return newTx;
  },

  async updateTransaction(id, updatedFields) {
    const list = await this.getTransactions();
    const index = list.findIndex(t => t.id === id);
    if (index !== -1) {
      list[index] = { ...list[index], ...updatedFields };
      await this.saveTransactions(list);
      return list[index];
    }
    return null;
  },

  async deleteTransaction(id) {
    const list = await this.getTransactions();
    const filtered = list.filter(t => t.id !== id);
    await this.saveTransactions(filtered);
    return true;
  },

  async loadSampleData() {
    const settings = await this.getSettings();
    settings.hasSampleData = true;
    settings.isConfigured = true;
    settings.currency = 'USD';
    settings.currencySymbol = '$';
    settings.overallMonthlyBudget = SAMPLE_BUDGETS.overall;

    const currentTx = await this.getTransactions();
    // Keep user's real transactions, only add sample if none present or append sample
    const nonSample = currentTx.filter(t => !t.isSample);
    const combined = [...SAMPLE_TRANSACTIONS, ...nonSample];

    await this.saveSettings(settings);
    await this.saveBudgets(SAMPLE_BUDGETS);
    await this.saveTransactions(combined);
    return true;
  },

  async removeSampleData() {
    const currentTx = await this.getTransactions();
    const nonSample = currentTx.filter(t => !t.isSample);
    await this.saveTransactions(nonSample);

    const settings = await this.getSettings();
    settings.hasSampleData = false;
    await this.saveSettings(settings);
    return true;
  },

  async clearAllData() {
    if (this.isExtension) {
      return new Promise((resolve) => {
        chrome.storage.local.clear(() => resolve(true));
      });
    } else {
      localStorage.clear();
      return true;
    }
  },

  async exportJsonBackup() {
    const [settings, categories, budgets, transactions] = await Promise.all([
      this.getSettings(),
      this.getCategories(),
      this.getBudgets(),
      this.getTransactions()
    ]);

    const backup = {
      app: 'SpendWise',
      version: '1.0.0',
      exportedAt: new Date().toISOString(),
      data: {
        settings,
        categories,
        budgets,
        transactions
      }
    };
    return JSON.stringify(backup, null, 2);
  },

  async importJsonBackup(jsonString) {
    try {
      const parsed = JSON.parse(jsonString);
      if (!parsed.data) throw new Error('Invalid backup structure');

      if (parsed.data.settings) await this.saveSettings(parsed.data.settings);
      if (parsed.data.categories) await this.saveCategories(parsed.data.categories);
      if (parsed.data.budgets) await this.saveBudgets(parsed.data.budgets);
      if (parsed.data.transactions) await this.saveTransactions(parsed.data.transactions);
      return true;
    } catch (e) {
      console.error('Import failed', e);
      throw e;
    }
  },

  async exportCsv() {
    const transactions = await this.getTransactions();
    const categories = await this.getCategories();
    const catMap = {};
    categories.forEach(c => { catMap[c.id] = c.name; });

    const headers = ['ID', 'Date', 'Type', 'Category', 'Amount', 'Note', 'IsRecurring', 'IsSample'];
    const rows = transactions.map(t => [
      `"${t.id}"`,
      `"${t.date}"`,
      `"${t.type}"`,
      `"${catMap[t.category] || t.category || 'Other'}"`,
      t.amount,
      `"${(t.note || '').replace(/"/g, '""')}"`,
      t.isRecurring ? 'Yes' : 'No',
      t.isSample ? 'Yes' : 'No'
    ]);

    return [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  }
};

window.StorageManager = StorageManager;
window.CURRENCY_SYMBOLS = {
  USD: '$',
  EUR: '€',
  GBP: '£',
  INR: '₹',
  CAD: 'CA$',
  AUD: 'AU$',
  JPY: '¥',
  CHF: 'CHF',
  CNY: '¥',
  BRL: 'R$'
};
