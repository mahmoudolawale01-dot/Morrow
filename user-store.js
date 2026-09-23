(function () {
  'use strict';

  const ACCOUNTS_KEY = 'morrow-accounts';
  const LEGACY_ACCOUNT_KEY = 'morrow-account';
  const SESSION_KEY = 'morrow-account-session';
  const ACTIVITY_KEY = 'morrow-account-activity';

  function read(key, fallback) {
    try {
      return JSON.parse(localStorage.getItem(key)) ?? fallback;
    } catch {
      return fallback;
    }
  }

  function getAccounts() {
    let accounts = read(ACCOUNTS_KEY, null);
    if (!Array.isArray(accounts)) accounts = [];
    const legacy = read(LEGACY_ACCOUNT_KEY, null);
    if (legacy?.email && !accounts.some((account) => account.email === legacy.email)) {
      accounts.push({ ...legacy, status: legacy.status || 'active', createdAt: legacy.createdAt || new Date().toISOString() });
      saveAccounts(accounts);
      if (sessionStorage.getItem(SESSION_KEY) === 'authenticated') sessionStorage.setItem(SESSION_KEY, legacy.email);
    }
    return accounts;
  }

  function saveAccounts(accounts) {
    localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(accounts));
    const currentEmail = sessionStorage.getItem(SESSION_KEY);
    const current = accounts.find((account) => account.email === currentEmail);
    if (current) localStorage.setItem(LEGACY_ACCOUNT_KEY, JSON.stringify(current));
    else if (currentEmail) localStorage.removeItem(LEGACY_ACCOUNT_KEY);
  }

  function getSessionEmail() {
    const stored = sessionStorage.getItem(SESSION_KEY);
    if (!stored) return null;

    if (stored === 'authenticated') {
      const legacy = read(LEGACY_ACCOUNT_KEY, null);
      if (legacy?.email && legacy.status !== 'suspended') return legacy.email;

      const activeAccounts = getAccounts().filter((account) => account.status === 'active');
      if (activeAccounts.length === 1) return activeAccounts[0].email;
      return null;
    }

    return stored;
  }

  function getSessionAccount() {
    const email = getSessionEmail();
    return email ? getAccounts().find((account) => account.email === email && account.status === 'active') || null : null;
  }

  function recordActivity(email, type) {
    const activity = read(ACTIVITY_KEY, []);
    activity.unshift({ email, type, date: new Date().toISOString() });
    localStorage.setItem(ACTIVITY_KEY, JSON.stringify(activity.slice(0, 500)));
  }

  function createAccount(account) {
    const accounts = getAccounts();
    accounts.push({ ...account, status: 'active', createdAt: new Date().toISOString() });
    saveAccounts(accounts);
    return accounts[accounts.length - 1];
  }

  function updateAccount(email, changes) {
    const accounts = getAccounts();
    const index = accounts.findIndex((account) => account.email === email);
    if (index < 0) return null;
    accounts[index] = { ...accounts[index], ...changes };
    saveAccounts(accounts);
    return accounts[index];
  }

  function signIn(email) {
    const account = getAccounts().find((item) => item.email === email);
    if (!account || account.status !== 'active') return null;
    sessionStorage.setItem(SESSION_KEY, account.email);
    recordActivity(account.email, 'logged in');
    localStorage.setItem(LEGACY_ACCOUNT_KEY, JSON.stringify(account));
    return account;
  }

  function clearLegacySessionIfNeeded() {
    if (sessionStorage.getItem(SESSION_KEY) === 'authenticated') {
      const legacy = read(LEGACY_ACCOUNT_KEY, null);
      if (legacy?.email) sessionStorage.setItem(SESSION_KEY, legacy.email);
    }
  }

  function signOut() {
    const account = getSessionAccount();
    if (account) recordActivity(account.email, 'logged out');
    sessionStorage.removeItem(SESSION_KEY);
    localStorage.removeItem(LEGACY_ACCOUNT_KEY);
  }

  function suspendAccount(email) {
    const account = updateAccount(email, { status: 'suspended' });
    if (getSessionAccount()?.email === email) signOut();
    return account;
  }

  function activateAccount(email) {
    return updateAccount(email, { status: 'active' });
  }

  function deleteAccount(email) {
    const accounts = getAccounts().filter((account) => account.email !== email);
    if (read(LEGACY_ACCOUNT_KEY, null)?.email === email) localStorage.removeItem(LEGACY_ACCOUNT_KEY);
    saveAccounts(accounts);
    if (sessionStorage.getItem(SESSION_KEY) === email) signOut();
    return accounts;
  }

  clearLegacySessionIfNeeded();

  window.MorrowUsers = {
    getAccounts,
    getSessionAccount,
    getSessionEmail,
    getActivity: () => read(ACTIVITY_KEY, []),
    createAccount,
    updateAccount,
    signIn,
    signOut,
    suspendAccount,
    activateAccount,
    deleteAccount,
    sessionKey: SESSION_KEY,
  };
})();
