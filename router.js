// Client-side Router for Morrow Objects
(function () {
  'use strict';

  const KEYS = { CART: 'morrow-cart', ACCOUNT: 'morrow-account', ORDERS: 'morrow-orders' };
  const state = {
    cart: load(KEYS.CART) || [],
    account: load(KEYS.ACCOUNT) || null,
    orders: load(KEYS.ORDERS) || [],
    page: 'home',
  };
  const subs = { cart: [], account: [], page: [] };

  function load(key) { try { return JSON.parse(localStorage.getItem(key)); } catch { return null; } }
  function save(key, val) { localStorage.setItem(key, JSON.stringify(val)); }

  // Subscriptions
  function on(evt, cb) { if (subs[evt]) subs[evt].push(cb); }
  function off(evt, cb) { if (subs[evt]) subs[evt] = subs[evt].filter((c) => c !== cb); }
  function emit(evt, data) { subs[evt].forEach((cb) => cb(data)); }

  // Cart
  function addToCart(p) {
    const ex = state.cart.find((i) => i.name === p.name);
    if (ex) ex.quantity += p.quantity || 1;
    else state.cart.push({ name: p.name, price: p.price, quantity: p.quantity || 1 });
    save(KEYS.CART, state.cart); emit('cart', state.cart); syncBadge();
  }
  function removeFromCart(name) {
    state.cart = state.cart.filter((i) => i.name !== name);
    save(KEYS.CART, state.cart); emit('cart', state.cart); syncBadge();
  }
  function updateQty(name, delta) {
    const it = state.cart.find((i) => i.name === name);
    if (!it) return;
    it.quantity += delta;
    if (it.quantity <= 0) removeFromCart(name);
    else { save(KEYS.CART, state.cart); emit('cart', state.cart); syncBadge(); }
  }
  function clearCart() { state.cart = []; save(KEYS.CART, []); emit('cart', state.cart); syncBadge(); }
  function cartCount() { return state.cart.reduce((t, i) => t + i.quantity, 0); }
  function cartTotal() { return state.cart.reduce((t, i) => t + i.price * i.quantity, 0); }
  function syncBadge() {
    const n = cartCount();
    document.querySelectorAll('.bag-count').forEach((el) => (el.textContent = n));
    return n;
  }

  // Account
  function login(email, name) { const a = { email, name: name || email }; state.account = a; save(KEYS.ACCOUNT, a); emit('account', a); return a; }
  function logout() { state.account = null; localStorage.removeItem(KEYS.ACCOUNT); emit('account', null); }
  function isLoggedIn() { return state.account !== null; }

  // Orders
  function createOrder(data) {
    const o = { ...data, orderNumber: data.orderNumber || genOrderNum(), date: data.date || new Date().toISOString() };
    state.orders.unshift(o); save(KEYS.ORDERS, state.orders);
    state.cart = []; save(KEYS.CART, []); syncBadge();
    return o;
  }
  function genOrderNum() {
    const c = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'; let r = 'MRW-';
    for (let i = 0; i < 8; i++) r += c.charAt(Math.floor(Math.random() * c.length));
    return r;
  }

  // Router
  const routes = {
    '/': { page: 'home', title: 'Morrow Objects | Considered living' },
    '/shop': { page: 'shop', title: 'Shop | Morrow Objects' },
    '/product': { page: 'product', title: 'Product | Morrow Objects' },
  };

  function parseRoute(path) {
    if (path === '/' || path === '/home') return { route: '/', params: {} };
    if (path === '/shop') return { route: '/shop', params: {} };
    if (path.startsWith('/product/')) return { route: '/product', params: { name: decodeURIComponent(path.slice(9)) } };
    if (path === '/product') return { route: '/product', params: {} };
    return { route: '/', params: {} };
  }

  function navigate(hash, push = true) {
    const p = hash.replace(/^#/, '') || '/';
    const { route, params } = parseRoute(p);
    const cfg = routes[route] || routes['/'];
    if (push) window.history.pushState({ route, params }, '', `#${p}`);
    state.page = cfg.page;
    emit('page', { page: cfg.page, path: p, params });
  }

  function onPopState() { navigate(window.location.hash || '/', false); }

  function initRouter() {
    window.addEventListener('popstate', onPopState);
    if (!window.location.hash) window.history.replaceState({ route: '/' }, '', '#/');
    navigate(window.location.hash || '/', false);
  }

  // Link interception
  function interceptLinks() {
    document.addEventListener('click', (e) => {
      const a = e.target.closest('a'); if (!a) return;
      const href = a.getAttribute('href'); if (!href) return;
      if (href.startsWith('http') || href.startsWith('mailto:') || href.startsWith('#') || a.target === '_blank') return;

      if (href.startsWith('product.html')) {
        const u = new URL(href, window.location.origin);
        const productId = u.searchParams.get('id') || u.searchParams.get('name');
        if (productId) { e.preventDefault(); navigate(`/product/${encodeURIComponent(productId)}`); return; }
      }
      if (href === 'index.html' || href === '/') { e.preventDefault(); navigate('/'); }
      else if (href === 'shop.html') { e.preventDefault(); navigate('/shop'); }
      else if (href.startsWith('index.html#')) { e.preventDefault(); navigate(`/${href.slice(11)}`); }
    });
  }

  // Keep static HTML pages as the navigation source. The router still owns
  // shared cart, account, order state, and hash metadata without hijacking links.
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => { initRouter(); syncBadge(); });
  } else { initRouter(); syncBadge(); }

  // Public API
  window.MorrowRouter = {
    getCart: () => [...state.cart], cartCount, cartTotal, getAccount: () => state.account,
    isLoggedIn, getOrders: () => [...state.orders], getCurrentPage: () => state.page,
    addToCart, removeFromCart, updateQty, clearCart, login, logout, createOrder,
    navigate, on, off, syncBadge,
  };
})();
