(function () {
  'use strict';

  const accountKey = 'morrow-account';
  const sessionKey = 'morrow-account-session';
  const currentPage = window.location.pathname.split('/').pop() || 'index.html';
  const publicPages = new Set(['index.html', 'shop.html', 'product.html', 'story.html', 'journal.html', 'seller.html']);

  const hasLocalAccount = () => {
    if (window.MorrowUsers) return Boolean(window.MorrowUsers.getSessionAccount());
    try {
      const account = JSON.parse(localStorage.getItem(accountKey));
      const session = sessionStorage.getItem(sessionKey);
      if (session === 'authenticated') return Boolean(account && account.status !== 'suspended');
      return Boolean(account && account.status !== 'suspended' && session === account.email);
    } catch {
      return false;
    }
  };

  const openAccountDialog = () => {
    const accountDialog = document.querySelector('.account-dialog');
    if (accountDialog && typeof accountDialog.showModal === 'function' && !accountDialog.open) {
      accountDialog.showModal();
    }
  };

  async function enforceAccess() {
    const params = new URLSearchParams(window.location.search);

    if (publicPages.has(currentPage)) {
      if (params.get('auth') === 'required' && !hasLocalAccount()) {
        openAccountDialog();
      }
      return;
    }

    let authenticated = hasLocalAccount();
    if (window.MorrowApi) {
      try {
        const response = await window.MorrowApi.apiRequest('/api/auth/me');
        authenticated = Boolean(response.user);
      } catch {
        authenticated = false;
      }
    }

    if (authenticated) return;
    window.location.replace('index.html?auth=required');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', enforceAccess, { once: true });
  } else {
    enforceAccess();
  }
})();