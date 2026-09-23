// Shared Navigation Component for Morrow Objects
(function () {
  'use strict';

  const CART_STORAGE_KEY = 'morrow-cart';
  const ACCOUNT_STORAGE_KEY = 'morrow-account';
  const ACCOUNT_SESSION_KEY = 'morrow-account-session';

  function getCartCount() {
    try {
      const cart = JSON.parse(localStorage.getItem(CART_STORAGE_KEY)) || [];
      return cart.reduce((total, item) => total + item.quantity, 0);
    } catch {
      return 0;
    }
  }

  function isLoggedIn() {
    if (window.MorrowUsers) return Boolean(window.MorrowUsers.getSessionAccount());
    try {
      const storedAccount = JSON.parse(localStorage.getItem(ACCOUNT_STORAGE_KEY));
      const sessionValue = sessionStorage.getItem(ACCOUNT_SESSION_KEY);
      if (sessionValue === 'authenticated') return Boolean(storedAccount && storedAccount.status !== 'suspended');
      return Boolean(storedAccount && sessionValue === storedAccount.email);
    } catch {
      return false;
    }
  }

  function getInitials() {
    if (window.MorrowUsers) {
      const account = window.MorrowUsers.getSessionAccount();
      if (account?.name) return account.name.charAt(0).toUpperCase();
      if (account?.email) return account.email.charAt(0).toUpperCase();
    }
    try {
      const account = JSON.parse(localStorage.getItem(ACCOUNT_STORAGE_KEY));
      if (account && account.name) {
        return account.name.charAt(0).toUpperCase();
      }
      if (account && account.email) {
        return account.email.charAt(0).toUpperCase();
      }
    } catch {
      // ignore
    }
    return 'U';
  }

  function createNavigation() {
    const isAuth = isLoggedIn();
    const userInitial = getInitials();
    const cartCount = getCartCount();

    const nav = document.createElement('header');
    nav.className = 'site-header';
    nav.innerHTML = `
      <a class="wordmark" href="index.html" aria-label="Morrow Objects home">morrow<span>.</span></a>
      <nav class="main-nav" aria-label="Main navigation">
        <a href="shop.html">Shop</a>
        <a href="story.html">Our story</a>
        <a href="journal.html">Journal</a>
      </nav>
      <div class="header-actions">
        <button class="icon-button" type="button" aria-label="Search" data-action="search">⌕</button>
        <button class="account-button" type="button" data-action="account">
          ${isAuth ? `<span class="account-avatar">${userInitial}</span>` : 'Account'}
        </button>
        <button class="bag-button" type="button" aria-label="Shopping bag" data-action="bag">Bag <span class="bag-count">${cartCount}</span></button>
        <button class="menu-button" type="button" aria-label="Open menu" data-action="menu">Menu</button>
      </div>
    `;

    return nav;
  }

  function createFooter() {
    const footer = document.createElement('footer');
    footer.className = 'site-footer';
    footer.innerHTML = `
      <a class="wordmark" href="index.html">morrow<span>.</span></a>
      <p>Considered objects for slower, better living.</p>
      <div class="footer-links">
        <a href="shop.html">Shop</a>
        <a href="story.html">About</a>
        <a href="mailto:hello@morrowobjects.com">Contact</a>
        <a href="index.html#top">Instagram</a>
      </div>
      <small>© 2024 Morrow Objects</small>
    `;
    return footer;
  }

  function init() {
    const existingHeader = document.querySelector('.site-header');
    if (existingHeader) {
      existingHeader.replaceWith(createNavigation());
    } else {
      const main = document.querySelector('main') || document.body;
      main.insertAdjacentElement('beforebegin', createNavigation());
    }

    const existingFooter = document.querySelector('.site-footer');
    if (!existingFooter) {
      const main = document.querySelector('main') || document.body;
      main.insertAdjacentElement('afterend', createFooter());
    }

    bindEvents();
  }

  function bindEvents() {
    const menuButton = document.querySelector('[data-action="menu"]');
    const nav = document.querySelector('.main-nav');

    if (menuButton && nav) {
      menuButton.addEventListener('click', () => {
        const isOpen = nav.classList.toggle('is-open');
        menuButton.textContent = isOpen ? 'Close' : 'Menu';
      });
    }
  }

  function updateCartCount() {
    const bagCount = document.querySelector('.bag-count');
    if (bagCount) {
      bagCount.textContent = getCartCount();
    }
  }

  function updateAccountState() {
    const accountButton = document.querySelector('.account-button');
    if (accountButton) {
      const isAuth = isLoggedIn();
      const userInitial = getInitials();
      accountButton.innerHTML = isAuth ? `<span class="account-avatar">${userInitial}</span>` : 'Account';
    }
  }

  init();

  window.MorrowNav = {
    updateCartCount,
    updateAccountState,
    getCartCount,
    isLoggedIn,
  };
})();
