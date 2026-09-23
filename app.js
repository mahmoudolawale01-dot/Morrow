const toast = document.querySelector('.toast');
const bagCount = document.querySelector('.bag-count');
const cartDrawer = document.querySelector('.cart-drawer');
const backdrop = document.querySelector('.drawer-backdrop');
const cartItems = document.querySelector('.cart-items');
const cartEmpty = document.querySelector('.cart-empty');
const cartTotal = document.querySelector('.cart-total');
const productDialog = document.querySelector('.product-dialog');
const accountDialog = document.querySelector('.account-dialog');
const accountForm = document.querySelector('.account-form');
const accountWelcome = document.querySelector('.account-welcome');
const accountTabs = document.querySelectorAll('.account-tab');
const accountRecoveryForm = document.querySelector('.account-recovery-form');
const accountRecoveryLink = document.querySelector('.account-recovery-link');
const accountRecoveryBack = document.querySelector('.account-back');
let toastTimer;

function injectPolishStyles() {
  const existing = document.querySelector('#morrow-polish-styles');
  if (existing) return;
  const style = document.createElement('style');
  style.id = 'morrow-polish-styles';
  style.textContent = `
    .cart-drawer {
      position: fixed;
      top: 0;
      right: 0;
      width: min(440px, 92vw);
      height: 100vh;
      background: rgba(244, 240, 232, 0.98);
      backdrop-filter: blur(8px);
      border-left: 1px solid var(--line, rgba(32,33,29,0.18));
      padding: 28px 24px 22px;
      transform: translateX(110%);
      transition: transform 0.22s ease;
      z-index: 20;
      display: flex;
      flex-direction: column;
      gap: 18px;
    }
    .cart-drawer.is-open {
      transform: translateX(0);
    }
    .drawer-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding-bottom: 12px;
      border-bottom: 1px solid var(--line, rgba(32,33,29,0.18));
    }
    .drawer-header h2 {
      margin: 0;
      font-size: clamp(24px, 3vw, 32px);
      letter-spacing: -0.05em;
    }
    .drawer-close,
    .dialog-close {
      border: 0;
      background: transparent;
      color: var(--ink, #20211d);
      font-size: 30px;
      line-height: 1;
      cursor: pointer;
    }
    .cart-items {
      display: grid;
      gap: 12px;
      overflow-y: auto;
      padding-right: 4px;
    }
    .cart-item {
      display: flex;
      justify-content: space-between;
      gap: 16px;
      padding: 12px 0;
      border-bottom: 1px solid rgba(32,33,29,0.09);
    }
    .cart-item-info {
      display: grid;
      gap: 4px;
      font-size: 13px;
    }
    .cart-item-info strong {
      font-weight: 600;
    }
    .cart-item-controls {
      display: flex;
      align-items: center;
      gap: 10px;
      font-size: 13px;
    }
    .qty-btn,
    .remove-btn {
      border: 1px solid rgba(32,33,29,0.2);
      background: rgba(255,255,255,0.35);
      width: 28px;
      height: 28px;
      border-radius: 50%;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
    }
    .cart-footer {
      margin-top: auto;
      display: grid;
      gap: 16px;
      border-top: 1px solid var(--line, rgba(32,33,29,0.18));
      padding-top: 18px;
    }
    .cart-footer > div {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      font-size: 13px;
      color: var(--muted, #76776e);
    }
    .cart-footer strong {
      color: var(--ink, #20211d);
      font-size: 24px;
      letter-spacing: -0.06em;
    }
    .checkout-button,
    .checkout-next,
    .checkout-done,
    .account-submit,
    .account-signout,
    .primary-button,
    .secondary-button {
      background: var(--coral, #dd8066);
      color: var(--ink, #20211d);
      border: 0;
      padding: 14px 18px;
      font-weight: 600;
      text-align: left;
      transition: transform 0.18s ease, opacity 0.18s ease;
    }
    .checkout-button:hover,
    .checkout-next:hover,
    .checkout-done:hover,
    .account-submit:hover,
    .account-signout:hover {
      transform: translateY(-1px);
    }
    .checkout-dialog {
      border: 0;
      padding: 0;
      background: rgba(244, 240, 232, 0.96);
      width: min(560px, calc(100vw - 32px));
      box-shadow: 0 28px 80px rgba(32,33,29,0.18);
    }
    .checkout-dialog::backdrop {
      background: rgba(32,33,29,0.42);
    }
    .checkout-panel {
      padding: 28px 28px 20px;
    }
    .checkout-steps {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 12px;
      margin-bottom: 24px;
    }
    .checkout-step {
      border: 1px solid rgba(32,33,29,0.18);
      background: rgba(255,255,255,0.3);
      color: var(--muted, #76776e);
      padding: 12px 10px;
      display: grid;
      place-items: center;
      gap: 6px;
    }
    .checkout-step.active {
      border-color: var(--coral, #dd8066);
      background: rgba(221, 128, 102, 0.08);
      color: var(--ink, #20211d);
    }
    .checkout-step.completed {
      border-color: rgba(32,33,29,0.24);
      background: rgba(32,33,29,0.05);
    }
    .step-number {
      font-family: var(--mono, monospace);
      font-size: 11px;
      letter-spacing: 0.12em;
      text-transform: uppercase;
    }
    .checkout-form,
    .checkout-confirmation {
      display: grid;
      gap: 14px;
    }
    .checkout-form h2,
    .checkout-confirmation h2 {
      margin: 0;
      font-size: clamp(28px, 4vw, 40px);
      letter-spacing: -0.06em;
    }
    .checkout-field {
      display: grid;
      gap: 8px;
    }
    .checkout-field label {
      font-family: var(--mono, monospace);
      font-size: 10px;
      letter-spacing: 0.12em;
      text-transform: uppercase;
      color: var(--muted, #76776e);
    }
    .checkout-field input {
      width: 100%;
      background: rgba(255,255,255,0.38);
      border: 1px solid rgba(32,33,29,0.2);
      padding: 12px 14px;
      color: var(--ink, #20211d);
    }
    .checkout-row {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 12px;
    }
    .checkout-actions {
      display: flex;
      justify-content: space-between;
      gap: 12px;
      margin-top: 12px;
    }
    .checkout-back {
      border: 0;
      background: transparent;
      color: var(--ink, #20211d);
      font-size: 13px;
      font-weight: 600;
      padding: 14px 0;
    }
    .confirmation-details {
      display: grid;
      gap: 10px;
      padding: 18px 0;
      border-top: 1px solid rgba(32,33,29,0.12);
      border-bottom: 1px solid rgba(32,33,29,0.12);
    }
    .confirmation-row {
      display: flex;
      justify-content: space-between;
      gap: 18px;
      color: var(--muted, #76776e);
      font-size: 13px;
    }
    .confirmation-row strong {
      color: var(--ink, #20211d);
      font-weight: 600;
    }
    .confirmation-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 14px;
      padding: 12px 0;
      border-bottom: 1px solid rgba(32,33,29,0.08);
    }
    .confirmation-item-info {
      display: grid;
      gap: 4px;
      font-size: 13px;
    }
    .confirmation-item-name {
      font-weight: 600;
    }
    .order-card {
      border: 1px solid rgba(32,33,29,0.14);
      background: rgba(255,255,255,0.2);
      padding: 18px 16px;
      display: grid;
      gap: 12px;
    }
    .order-header,
    .order-footer {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      gap: 12px;
      flex-wrap: wrap;
    }
    .order-number {
      font-family: var(--mono, monospace);
      font-size: 11px;
      letter-spacing: 0.12em;
      text-transform: uppercase;
    }
    .order-total {
      font-size: 20px;
      letter-spacing: -0.05em;
    }
    .toast {
      position: fixed;
      left: 50%;
      bottom: 26px;
      transform: translate(-50%, 24px);
      background: rgba(32,33,29,0.96);
      color: #f4f0e8;
      padding: 12px 18px;
      border-radius: 999px;
      font-size: 12px;
      letter-spacing: 0.04em;
      opacity: 0;
      pointer-events: none;
      transition: opacity 0.2s ease, transform 0.2s ease;
      z-index: 30;
    }
    .toast.show {
      opacity: 1;
      transform: translate(-50%, 0);
    }
    .account-session-time {
      display: grid;
      gap: 4px;
      margin: 18px 0 22px;
      padding: 12px 14px;
      border-left: 3px solid var(--tertiary, #C9A227);
      background: rgba(201, 162, 39, 0.09);
    }
    .account-session-time strong {
      font-family: var(--mono, monospace);
      font-size: 10px;
      letter-spacing: 0.1em;
      text-transform: uppercase;
      color: var(--muted, #687080);
    }
    .account-session-time span {
      font-size: 13px;
      color: var(--ink, #1F2937);
    }
    @media (max-width: 620px) {
      .checkout-row {
        grid-template-columns: 1fr;
      }
      .checkout-actions {
        flex-direction: column;
      }
      .checkout-steps {
        gap: 8px;
      }
    }
  `;
  document.head.appendChild(style);
}

injectPolishStyles();

// Use router.js cart if available, otherwise fallback to local
function getBagItems() {
  if (window.MorrowRouter) {
    return window.MorrowRouter.getCart();
  }
  return loadCart();
}

const CART_STORAGE_KEY = 'morrow-cart';
const ORDERS_STORAGE_KEY = 'morrow-orders';
const ACCOUNT_SESSION_KEY = 'morrow-account-session';

function loadCart() {
  try {
    return JSON.parse(localStorage.getItem(CART_STORAGE_KEY)) || [];
  } catch {
    return [];
  }
}

function saveCart() {
  localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(getBagItems()));
}

async function loadOrders() {
  if (window.MorrowApi) {
    try {
      const response = await window.MorrowApi.apiRequest('/api/orders');
      const orders = Array.isArray(response.orders) ? response.orders : [];
      localStorage.setItem(ORDERS_STORAGE_KEY, JSON.stringify(orders));
      return orders;
    } catch {
      try {
        const orders = JSON.parse(localStorage.getItem(ORDERS_STORAGE_KEY)) || [];
        const account = JSON.parse(localStorage.getItem('morrow-account') || 'null');
        return account ? orders.filter((order) => order.buyer?.email === account.email) : orders;
      } catch {
        return [];
      }
    }
  }
  try {
    const orders = JSON.parse(localStorage.getItem(ORDERS_STORAGE_KEY)) || [];
    const account = window.MorrowUsers?.getSessionAccount() || JSON.parse(localStorage.getItem('morrow-account') || 'null');
    return account ? orders.filter((order) => order.buyer?.email === account.email) : orders;
  } catch {
    return [];
  }
}

async function saveOrder(order) {
  if (window.MorrowApi) {
    const response = await window.MorrowApi.apiRequest('/api/orders', { method: 'POST', body: JSON.stringify(order) });
    const savedOrder = response.order;
    try {
      const localOrders = JSON.parse(localStorage.getItem(ORDERS_STORAGE_KEY) || '[]');
      localOrders.unshift(savedOrder);
      localStorage.setItem(ORDERS_STORAGE_KEY, JSON.stringify(localOrders));
    } catch {
      localStorage.setItem(ORDERS_STORAGE_KEY, JSON.stringify([savedOrder]));
    }
    return savedOrder;
  }
  if (window.MorrowRouter) {
    const storedOrder = window.MorrowRouter.createOrder(order);
    try {
      const localOrders = JSON.parse(localStorage.getItem(ORDERS_STORAGE_KEY) || '[]');
      localOrders.unshift(storedOrder);
      localStorage.setItem(ORDERS_STORAGE_KEY, JSON.stringify(localOrders));
    } catch {
      localStorage.setItem(ORDERS_STORAGE_KEY, JSON.stringify([storedOrder]));
    }
    return storedOrder;
  }
  const orders = JSON.parse(localStorage.getItem(ORDERS_STORAGE_KEY) || '[]');
  orders.unshift(order);
  localStorage.setItem(ORDERS_STORAGE_KEY, JSON.stringify(orders));
  return order;
}

function formatDate(dateString) {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function updateBadge() {
  const items = getBagItems();
  const count = items.reduce((total, item) => total + item.quantity, 0);
  document.querySelectorAll('.bag-count').forEach((el) => {
    el.textContent = count;
  });
}

function updateSubtotal() {
  const items = getBagItems();
  const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  if (cartTotal) cartTotal.textContent = `$${total}`;
}

function showToast(message) {
  if (!toast) return;
  toast.textContent = message;
  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), 2600);
}

function resolveQuickAddProduct(productName) {
  if (window.MorrowProducts && typeof window.MorrowProducts.getByName === 'function') {
    const product = window.MorrowProducts.getByName(productName);
    if (product) return product;
  }

  const card = document.querySelector(`.product-card[data-name="${CSS.escape(productName)}"]`);
  if (!card) return null;

  return {
    name: card.dataset.name,
    price: Number(card.dataset.price),
  };
}

// Quick add buttons - works on all pages
document.querySelectorAll('.quick-add').forEach((button) => {
  button.addEventListener('click', () => {
    const productName = button.dataset.product;
    const card = button.closest('.product-card');
    const product = resolveQuickAddProduct(productName);

    if (product) {
      if (window.MorrowRouter) {
        window.MorrowRouter.addToCart({
          name: product.name,
          price: product.price,
          quantity: 1,
        });
      } else if (card) {
        addToBag(productName);
      }

      showToast(`${product.name} added to your bag`);
      renderCart();
      updateBadge();
      return;
    }

    if (card) {
      addToBag(productName);
      showToast(`${productName} added to your bag`);
    }
  });
});

const bagButton = document.querySelector('[data-action="bag"]');
if (bagButton) {
  bagButton.addEventListener('click', () => {
    renderCart();
    cartDrawer.classList.add('is-open');
    cartDrawer.setAttribute('aria-hidden', 'false');
    backdrop.classList.add('is-visible');
  });
}

function addToBag(name) {
  const product = document.querySelector(`[data-name="${name}"]`);
  if (window.MorrowRouter && product) {
    window.MorrowRouter.addToCart({
      name: name,
      price: Number(product.dataset.price),
      quantity: 1,
    });
  } else {
    const bagItems = getBagItems();
    const existing = bagItems.find((item) => item.name === name);
    if (existing) existing.quantity += 1;
    else bagItems.push({ name, price: Number(product.dataset.price), quantity: 1 });
    saveCart();
    updateBadge();
  }
  renderCart();
}

function updateQuantity(name, delta) {
  if (window.MorrowRouter) {
    window.MorrowRouter.updateQty(name, delta);
  } else {
    const bagItems = getBagItems();
    const item = bagItems.find((item) => item.name === name);
    if (!item) return;
    item.quantity += delta;
    if (item.quantity <= 0) {
      const idx = bagItems.indexOf(item);
      bagItems.splice(idx, 1);
    }
    saveCart();
    updateBadge();
  }
  renderCart();
}

function renderCart() {
  const items = getBagItems();
  cartItems.innerHTML = items
    .map(
      (item) => `
      <div class="cart-item">
        <div class="cart-item-info">
          <strong>${item.name}</strong>
          <span>$${item.price} each</span>
        </div>
        <div class="cart-item-controls">
          <button type="button" class="qty-btn" data-decrement="${item.name}" aria-label="Decrease quantity of ${item.name}">−</button>
          <span class="qty-value">${item.quantity}</span>
          <button type="button" class="qty-btn" data-increment="${item.name}" aria-label="Increase quantity of ${item.name}">+</button>
          <button type="button" class="remove-btn" data-remove="${item.name}" aria-label="Remove ${item.name}">×</button>
        </div>
      </div>
    `
    )
    .join('');
  cartEmpty.hidden = items.length > 0;
  cartItems.hidden = items.length === 0;
  updateSubtotal();

  cartItems.querySelectorAll('[data-increment]').forEach((button) => {
    button.addEventListener('click', () => updateQuantity(button.dataset.increment, 1));
  });
  cartItems.querySelectorAll('[data-decrement]').forEach((button) => {
    button.addEventListener('click', () => updateQuantity(button.dataset.decrement, -1));
  });
  cartItems.querySelectorAll('[data-remove]').forEach((button) => {
    button.addEventListener('click', () => {
      if (window.MorrowRouter) {
        window.MorrowRouter.removeFromCart(button.dataset.remove);
      } else {
        const bagItems = getBagItems();
        const idx = bagItems.findIndex((i) => i.name === button.dataset.remove);
        if (idx > -1) bagItems.splice(idx, 1);
        saveCart();
        updateBadge();
      }
      renderCart();
    });
  });
}

function closeCart() {
  cartDrawer.classList.remove('is-open');
  cartDrawer.setAttribute('aria-hidden', 'true');
  backdrop.classList.remove('is-visible');
}

const ordersEmpty = document.querySelector('.orders-empty');
const ordersList = document.querySelector('.orders-list');

async function renderOrders() {
  const orders = await loadOrders();
  ordersEmpty.hidden = orders.length > 0;
  ordersList.hidden = orders.length === 0;

  ordersList.innerHTML = orders
    .map(
      (order) => `
      <div class="order-card">
        <div class="order-header">
          <span class="order-number">${order.orderNumber}</span>
          <span class="order-date">${formatDate(order.date)}</span>
        </div>
        <div class="order-items">
          ${order.items
            .map(
              (item) => `
            <div class="order-item">
              <span class="order-item-name">${item.name}</span>
              <span class="order-item-qty">Qty ${item.quantity} · $${item.price * item.quantity}</span>
            </div>
          `
            )
            .join('')}
        </div>
        <div class="order-footer">
          <span class="order-total">$${order.total}</span>
          <span class="order-receipt">${order.receipt?.receiptNumber || 'Receipt unavailable'}${order.receipt?.cardLast4 ? ` · Card ending ${order.receipt.cardLast4}` : ''}</span>
          <button type="button" class="order-reorder" data-order="${order.orderNumber}">Reorder</button>
        </div>
      </div>
    `
    )
    .join('');

  ordersList.querySelectorAll('.order-reorder').forEach((button) => {
    button.addEventListener('click', () => reorderItems(button.dataset.order));
  });
}

async function reorderItems(orderNumber) {
  const orders = await loadOrders();
  const order = orders.find((o) => o.orderNumber === orderNumber);
  if (!order) return;

  if (window.MorrowRouter) {
    order.items.forEach((item) => window.MorrowRouter.addToCart(item));
  } else {
    const bagItems = getBagItems();
    order.items.forEach((item) => {
      const existing = bagItems.find((i) => i.name === item.name);
      if (existing) existing.quantity += item.quantity;
      else bagItems.push({ ...item });
    });
    saveCart();
  }

  renderCart();
  updateBadge();
  renderOrders();

  showToast('Items added to your bag');
  announceToScreenReader(`Items from order ${orderNumber} have been added to your bag.`);
}

const checkoutDialog = document.querySelector('.checkout-dialog');
const checkoutForms = document.querySelectorAll('.checkout-form');
const checkoutSteps = document.querySelectorAll('.checkout-step');
const checkoutClose = document.querySelector('.checkout-close');
const checkoutBack = document.querySelector('.checkout-back');
const checkoutDone = document.querySelector('.checkout-done');
const confirmationSection = document.querySelector('.checkout-confirmation');
const orderNumber = document.querySelector('.checkout-confirmation .order-number');
const orderItemCount = document.querySelector('.checkout-confirmation .order-item-count');
const orderTotal = document.querySelector('.checkout-confirmation .order-total');
const confirmationItems = document.querySelector('.checkout-confirmation .confirmation-items');
const checkoutAnnouncer = document.createElement('div');

let checkoutStep = 1;

checkoutAnnouncer.setAttribute('role', 'status');
checkoutAnnouncer.setAttribute('aria-live', 'polite');
checkoutAnnouncer.setAttribute('aria-atomic', 'true');
checkoutAnnouncer.classList.add('sr-only');
checkoutAnnouncer.style.cssText = 'position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0';
document.body.appendChild(checkoutAnnouncer);

function announceToScreenReader(message) {
  checkoutAnnouncer.textContent = '';
  requestAnimationFrame(() => {
    checkoutAnnouncer.textContent = message;
  });
}

function generateOrderNumber() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = 'MRW-';
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

function updateCheckoutSteps() {
  checkoutSteps.forEach((step) => {
    const stepNum = parseInt(step.dataset.step);
    step.classList.remove('active', 'completed');
    if (stepNum === checkoutStep) {
      step.classList.add('active');
      step.setAttribute('aria-selected', 'true');
    } else if (stepNum < checkoutStep) {
      step.classList.add('completed');
      step.setAttribute('aria-selected', 'false');
    } else {
      step.setAttribute('aria-selected', 'false');
    }
  });

  checkoutForms.forEach((form) => {
    const formStep = parseInt(form.dataset.checkoutStep);
    form.hidden = formStep !== checkoutStep;
  });

  confirmationSection.hidden = checkoutStep !== 3;
}

function prefillCheckoutForm() {
  const savedAccount = JSON.parse(localStorage.getItem('morrow-account') || 'null');
  if (savedAccount) {
    document.getElementById('checkout-email').value = savedAccount.email || '';
    document.getElementById('checkout-name').value = savedAccount.name || '';
  }
}

function resetCheckoutForm() {
  checkoutForms.forEach((form) => form.reset());
  checkoutStep = 1;
  updateCheckoutSteps();
  prefillCheckoutForm();
}

function openCheckout() {
  if (getBagItems().length === 0) {
    showToast('Your bag is empty');
    announceToScreenReader('Your bag is empty. Add items before checking out.');
    return;
  }
  closeCart();
  resetCheckoutForm();
  checkoutDialog.showModal();
  announceToScreenReader('Checkout opened. Step 1 of 3: Contact and Shipping information.');
}

function closeCheckout() {
  checkoutDialog.close();
}

function goToStep(step) {
  checkoutStep = step;
  updateCheckoutSteps();
  const stepNames = {
    1: 'Contact and Shipping information',
    2: 'Payment method',
    3: 'Order confirmation',
  };
  announceToScreenReader(`Step ${step} of 3: ${stepNames[step]}.`);
}

async function completeOrder() {
  const items = getBagItems();
  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);
  const totalPrice = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const generatedOrderNumber = generateOrderNumber();
  const cardNumber = document.getElementById('checkout-card-number')?.value.replace(/\D/g, '') || '';

  const order = {
    orderNumber: generatedOrderNumber,
    date: new Date().toISOString(),
    buyer: {
      name: document.getElementById('checkout-name').value.trim(),
      email: document.getElementById('checkout-email').value.trim().toLowerCase(),
    },
    shipping: {
      address: document.getElementById('checkout-address').value.trim(),
      city: document.getElementById('checkout-city').value.trim(),
      postalCode: document.getElementById('checkout-postal').value.trim(),
      country: document.getElementById('checkout-country').value.trim(),
    },
    receipt: {
      receiptNumber: `RCT-${generatedOrderNumber.slice(4)}`,
      paymentMethod: 'Card',
      cardholder: document.getElementById('checkout-card-name').value.trim(),
      cardLast4: cardNumber.slice(-4),
    },
    items: [...items],
    total: totalPrice,
  };

  let savedOrder;
  try {
    savedOrder = await saveOrder(order);
  } catch (error) {
    showToast(error.message);
    announceToScreenReader(`We could not place your order. ${error.message}`);
    return;
  }

  if (typeof renderOrders === 'function') {
    await renderOrders();
  }

  orderNumber.textContent = savedOrder.orderNumber || generatedOrderNumber;
  orderItemCount.textContent = `${totalItems} item${totalItems !== 1 ? 's' : ''}`;
  orderTotal.textContent = `$${totalPrice}`;

  confirmationItems.innerHTML = items
    .map(
      (item) => `
      <div class="confirmation-item">
        <div class="confirmation-item-info">
          <span class="confirmation-item-name">${item.name}</span>
          <span class="confirmation-item-meta">Qty ${item.quantity} · $${item.price} each</span>
        </div>
        <span class="confirmation-item-price">$${item.price * item.quantity}</span>
      </div>
    `
    )
    .join('');

  localStorage.setItem(CART_STORAGE_KEY, JSON.stringify([]));
  if (window.MorrowRouter) {
    window.MorrowRouter.clearCart?.();
  }
  renderCart();
  updateBadge();

  checkoutStep = 3;
  updateCheckoutSteps();
  announceToScreenReader(`Order placed successfully! Order number ${savedOrder.orderNumber || generatedOrderNumber}. ${totalItems} item${totalItems !== 1 ? 's' : ''} for a total of $${totalPrice}. Your bag has been cleared.`);
  return savedOrder;
}

document.querySelector('.checkout-button').addEventListener('click', () => {
  closeCart();
  openCheckout();
});

checkoutClose.addEventListener('click', () => {
  resetCheckoutForm();
  closeCheckout();
});

checkoutDialog.addEventListener('cancel', (event) => {
  event.preventDefault();
  resetCheckoutForm();
  closeCheckout();
});

checkoutForms[0].addEventListener('submit', (event) => {
  event.preventDefault();
  if (event.target.reportValidity()) {
    goToStep(2);
    checkoutForms[1].querySelector('input').focus();
  }
});

checkoutForms[1].addEventListener('submit', async (event) => {
  event.preventDefault();
  if (!event.target.reportValidity()) return;
  const placed = await completeOrder();
  if (placed) checkoutDone.focus();
});

checkoutBack.addEventListener('click', () => {
  goToStep(1);
});

checkoutDone.addEventListener('click', () => {
  resetCheckoutForm();
  closeCheckout();
});

document.querySelector('.drawer-close').addEventListener('click', closeCart);
backdrop.addEventListener('click', closeCart);

// Product dialog - open from product cards and search results
productDialog.querySelector('.dialog-close').addEventListener('click', () => productDialog.close());
document.querySelectorAll('[data-details]').forEach((button) => {
  button.addEventListener('click', () => openProductDialog(button.closest('.product-card')));
});
document.querySelector('.dialog-add').addEventListener('click', (event) => {
  const productName = event.currentTarget.dataset.product;
  const product = resolveQuickAddProduct(productName);
  if (window.MorrowRouter && product) {
    window.MorrowRouter.addToCart({
      name: product.name,
      price: product.price,
      quantity: 1,
    });
  }
  productDialog.close();
  showToast(`${productName} added to your bag`);
  renderCart();
  updateBadge();
});

// Filter tabs - works on home page and shop page
document.querySelectorAll('.filter-tab').forEach((button) => button.addEventListener('click', () => {
  document.querySelectorAll('.filter-tab').forEach((tab) => tab.classList.remove('active'));
  button.classList.add('active');
  document.querySelectorAll('.product-card').forEach((card) => { card.hidden = button.dataset.filter !== 'all' && card.dataset.category !== button.dataset.filter; });
}));

const searchDialog = document.querySelector('.search-dialog');
const searchInput = document.querySelector('.search-input');
const searchClear = document.querySelector('.search-clear');
const searchEmpty = document.querySelector('.search-empty');
const searchNoResults = document.querySelector('.search-no-results');
const searchGrid = document.querySelector('.search-grid');

function getProducts() {
  if (window.MorrowProducts) {
    return window.MorrowProducts.getAll();
  }
  // Fallback to DOM if products.js not loaded
  return Array.from(document.querySelectorAll('.product-card')).map((card) => ({
    name: card.dataset.name,
    category: card.dataset.category,
    price: Number(card.dataset.price),
    description: card.dataset.description,
    image: card.querySelector('img').src,
    imageAlt: card.querySelector('img').alt,
    meta: card.querySelector('.product-meta p')?.textContent || '',
  }));
}

function highlightMatch(text, query) {
  if (!query) return text;
  const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
  return text.replace(regex, '<mark>$1</mark>');
}

function renderSearchResults(query) {
  const products = getProducts();
  const normalizedQuery = query.toLowerCase().trim();
  const matched = normalizedQuery
    ? products.filter((p) => {
        const searchText = `${p.name} ${p.category} ${p.description} ${p.meta}`.toLowerCase();
        return searchText.includes(normalizedQuery);
      })
    : [];

  searchEmpty.hidden = normalizedQuery.length > 0;
  searchNoResults.hidden = normalizedQuery.length === 0 || matched.length > 0;
  searchGrid.hidden = matched.length === 0;

  searchGrid.innerHTML = matched
    .map((product) => {
      const highlightedName = highlightMatch(product.name, query);
      const highlightedMeta = highlightMatch(product.meta, query);
      return `
      <button type="button" class="search-product-card" data-product="${product.name}">
        <div class="search-product-image-wrap">
          <img class="search-product-image" src="${product.image}" alt="${product.imageAlt}" />
          <span class="search-product-quick-add" data-add="${product.name}">Quick add</span>
        </div>
        <h3 class="search-product-name">${highlightedName}</h3>
        <p class="search-product-meta">${highlightedMeta}</p>
        <p class="search-product-price">$${product.price}</p>
      </button>
    `;
    })
    .join('');

  searchGrid.querySelectorAll('.search-product-card').forEach((card) => {
    card.addEventListener('click', () => {
      const productName = card.dataset.product;
      searchDialog.close();
      window.location.href = `product.html?name=${encodeURIComponent(productName)}`;
    });
  });

  searchGrid.querySelectorAll('.search-product-quick-add').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      addToBag(btn.dataset.add);
      showToast(`${btn.dataset.add} added to your bag`);
    });
  });
}

function openProductDialog(productCard) {
  productDialog.querySelector('.dialog-image').src = productCard.querySelector('img').src;
  productDialog.querySelector('.dialog-image').alt = productCard.querySelector('img').alt;
  productDialog.querySelector('.dialog-title').textContent = productCard.dataset.name;
  productDialog.querySelector('.dialog-description').textContent = productCard.dataset.description;
  productDialog.querySelector('.dialog-price').textContent = `$${productCard.dataset.price}`;
  productDialog.querySelector('.dialog-add').dataset.product = productCard.dataset.name;
  productDialog.showModal();
}

document.querySelector('[data-action="search"]').addEventListener('click', () => {
  searchDialog.showModal();
  searchInput.focus();
});

document.querySelector('.search-close').addEventListener('click', () => {
  searchDialog.close();
});

searchDialog.addEventListener('cancel', (event) => {
  event.preventDefault();
  searchDialog.close();
});

searchInput.addEventListener('input', () => {
  searchClear.hidden = searchInput.value.length === 0;
  renderSearchResults(searchInput.value);
});

searchClear.addEventListener('click', () => {
  searchInput.value = '';
  searchClear.hidden = true;
  searchInput.focus();
  renderSearchResults('');
});

searchDialog.addEventListener('close', () => {
  searchInput.value = '';
  searchClear.hidden = true;
  renderSearchResults('');
});

document.querySelector('[data-action="menu"]').addEventListener('click', (event) => {
  const nav = document.querySelector('.main-nav');
  const isOpen = nav.classList.toggle('is-open');
  event.currentTarget.textContent = isOpen ? 'Close' : 'Menu';
});

const signupForm = document.querySelector('.signup-form');
if (signupForm) {
  signupForm.addEventListener('submit', (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const message = form.querySelector('.form-message');
    message.textContent = 'You are on the list. Welcome to Morrow.';
    form.querySelector('input').value = '';
  });
}

function setAccountMode(mode) {
  const isSignup = mode === 'signup';
  accountTabs.forEach((tab) => {
    const isActive = tab.dataset.accountMode === mode;
    tab.classList.toggle('active', isActive);
    tab.setAttribute('aria-selected', isActive);
  });
  accountForm.querySelector('.account-name-field').hidden = !isSignup;
  accountForm.querySelector('#account-name').required = isSignup;
  accountForm.querySelector('#account-password').autocomplete = isSignup ? 'new-password' : 'current-password';
  accountForm.querySelector('.account-submit').firstChild.textContent = isSignup ? 'Create account ' : 'Log in ';
  accountForm.querySelector('.account-message').textContent = '';

  const passwordField = accountForm.querySelector('#account-password');
  const toggleButton = accountForm.querySelector('.password-toggle');
  if (passwordField && toggleButton) {
    passwordField.type = 'password';
    toggleButton.textContent = 'Show';
    toggleButton.setAttribute('aria-label', 'Show password');
  }
}

function setRecoveryMode(isRecovery) {
  accountForm.hidden = isRecovery;
  accountRecoveryForm.hidden = !isRecovery;
  accountTabs.forEach((tab) => { tab.hidden = isRecovery; });
  document.querySelector('#account-title').textContent = isRecovery ? 'Reset your password.' : 'Welcome back.';
  if (!isRecovery) setAccountMode('login');
}

function bindPasswordToggle() {
  document.querySelectorAll('.password-toggle').forEach((toggleButton) => {
    toggleButton.addEventListener('click', () => {
      const passwordInput = toggleButton.closest('.password-input-wrap')?.querySelector('input');
      if (!passwordInput) return;

      const shouldShow = passwordInput.type === 'password';
      passwordInput.type = shouldShow ? 'text' : 'password';
      toggleButton.textContent = shouldShow ? 'Hide' : 'Show';
      toggleButton.setAttribute('aria-label', shouldShow ? 'Hide password' : 'Show password');
    });
  });
}

function renderAccount() {
  const localAccount = (() => {
    try {
      return JSON.parse(localStorage.getItem('morrow-account') || 'null');
    } catch {
      return null;
    }
  })();
  const savedAccount = localAccount || window.MorrowUsers?.getSessionAccount() || null;
  accountForm.hidden = Boolean(savedAccount);
  accountWelcome.hidden = !savedAccount;
  if (savedAccount) {
    accountWelcome.querySelector('.account-member-name').textContent = savedAccount.name || savedAccount.email;
    let sessionTime = accountWelcome.querySelector('.account-session-time');
    if (!sessionTime) {
      sessionTime = document.createElement('div');
      sessionTime.className = 'account-session-time';
      sessionTime.innerHTML = '<strong>Signed in</strong><span></span>';
      const intro = accountWelcome.querySelector('.account-member-name')?.nextElementSibling;
      intro?.after(sessionTime);
    }
    const signedInAt = savedAccount.signed_in_at || sessionStorage.getItem('morrow-signed-in-at');
    sessionTime.querySelector('span').textContent = signedInAt
      ? new Date(signedInAt).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
      : 'Current session';
    renderOrders();
  }
  document.body.classList.toggle('auth-required', !savedAccount);
  return savedAccount;
}

function persistAuthenticatedAccount(account) {
  if (!account) return;
  if (!account.signed_in_at) account.signed_in_at = new Date().toISOString();
  sessionStorage.setItem('morrow-signed-in-at', account.signed_in_at);
  localStorage.setItem('morrow-account', JSON.stringify(account));
  sessionStorage.setItem(ACCOUNT_SESSION_KEY, account.email);
  if (window.MorrowUsers) {
    const existing = window.MorrowUsers.getAccounts().find((item) => item.email === account.email);
    if (existing) window.MorrowUsers.updateAccount(account.email, account);
    else window.MorrowUsers.createAccount(account);
    sessionStorage.setItem(window.MorrowUsers.sessionKey, account.email);
  }
  renderAccount();
  window.MorrowNav?.updateAccountState();
}

async function syncBackendAccount() {
  try {
    const response = await window.MorrowApi.apiRequest('/api/auth/me');
    const account = response.user;
    persistAuthenticatedAccount(account);
    return account;
  } catch {
    sessionStorage.removeItem(ACCOUNT_SESSION_KEY);
    return null;
  }
}

async function hashAccountPassword(password) {
  const bytes = new TextEncoder().encode(password);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

document.querySelector('[data-action="account"]').addEventListener('click', async () => {
  await syncBackendAccount();
  renderAccount();
  setRecoveryMode(false);
  accountDialog.showModal();
});

accountTabs.forEach((tab) => tab.addEventListener('click', () => setAccountMode(tab.dataset.accountMode)));
const accountClose = document.querySelector('.account-close');
if (accountClose) {
  accountClose.addEventListener('click', () => {
    if (!document.body.classList.contains('auth-required')) accountDialog.close();
  });
}
accountDialog.addEventListener('cancel', (event) => {
  if (document.body.classList.contains('auth-required')) event.preventDefault();
});
document.querySelector('.account-signout').addEventListener('click', () => {
  window.MorrowApi.apiRequest('/api/auth/logout', { method: 'POST' }).catch(() => {});
  if (window.MorrowUsers) window.MorrowUsers.signOut();
  sessionStorage.removeItem(ACCOUNT_SESSION_KEY);
  renderAccount();
  window.MorrowNav?.updateAccountState();
  document.body.classList.add('auth-required');
  setAccountMode('login');
  accountDialog.showModal();
  showToast('You have been signed out');
});

accountRecoveryLink.addEventListener('click', () => {
  setRecoveryMode(true);
  accountRecoveryForm.reset();
});

accountRecoveryBack.addEventListener('click', () => {
  setRecoveryMode(false);
});

accountRecoveryForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  if (!accountRecoveryForm.reportValidity()) return;
  const message = accountRecoveryForm.querySelector('.account-message');
  message.textContent = 'Password recovery will be connected to the backend email flow in the next phase.';
});

accountForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  if (!accountForm.reportValidity()) return;
  const isSignup = accountForm.querySelector('.account-name-field').hidden === false;
  const email = accountForm.querySelector('#account-email').value.trim().toLowerCase();
  const name = accountForm.querySelector('#account-name').value.trim();
  const password = accountForm.querySelector('#account-password').value;
  const accountMessage = accountForm.querySelector('.account-message');
  try {
    const response = await window.MorrowApi.apiRequest(isSignup ? '/api/auth/register' : '/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, name, password }),
    });
    persistAuthenticatedAccount(response.user);
    accountDialog.close();
    showToast(isSignup ? 'Your Morrow account is ready' : 'Welcome back to Morrow');
  } catch (error) {
    accountMessage.textContent = error.message;
  }
});

const savedAccount = renderAccount();
syncBackendAccount();
bindPasswordToggle();
