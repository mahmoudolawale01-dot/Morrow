const PRODUCTS_KEY = 'morrow-admin-products';
const SUBMISSIONS_KEY = 'morrow-seller-submissions';
const defaultProducts = window.MorrowProducts.getAll().map((product) => ({ ...product, published: true }));
const productDialog = document.querySelector('#product-dialog');
const productForm = document.querySelector('#product-form');
const productsBody = document.querySelector('#admin-products');
const toast = document.querySelector('.toast');

function readJson(key, fallback) {
  try {
    return JSON.parse(localStorage.getItem(key)) || fallback;
  } catch {
    return fallback;
  }
}

function getProducts() {
  return readJson(PRODUCTS_KEY, defaultProducts);
}

function saveProducts(products) {
  localStorage.setItem(PRODUCTS_KEY, JSON.stringify(products));
}

function showToast(message) {
  toast.textContent = message;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 2400);
}

function renderProducts() {
  const products = getProducts();
  document.querySelector('#product-count').textContent = `${products.length} product${products.length === 1 ? '' : 's'}`;
  productsBody.innerHTML = products.map((product, index) => `
    <tr>
      <td><strong>${product.name}</strong><span class="table-subtext">${product.meta}</span></td>
      <td>${product.category}</td>
      <td>$${product.price}</td>
      <td><span class="status-pill ${product.published ? 'is-live' : ''}">${product.published ? 'Published' : 'Hidden'}</span></td>
      <td><div class="order-controls"><button type="button" data-move="up" data-index="${index}" aria-label="Move ${product.name} up">↑</button><button type="button" data-move="down" data-index="${index}" aria-label="Move ${product.name} down">↓</button></div></td>
      <td><div class="row-actions"><button type="button" data-edit="${product.id}">Edit</button><button type="button" data-delete="${product.id}">Delete</button></div></td>
    </tr>`).join('');
  bindProductActions();
}

function setField(id, value) {
  document.querySelector(`#${id}`).value = value ?? '';
}

function openProduct(product) {
  document.querySelector('#form-title').textContent = product ? 'Edit product' : 'Add product';
  setField('product-id', product?.id);
  setField('product-name', product?.name);
  setField('product-category', product?.category || 'ceramics');
  setField('product-price', product?.price);
  setField('product-description', product?.description);
  setField('product-image', product?.image);
  setField('product-meta', product?.meta);
  document.querySelector('#product-published').checked = product?.published !== false;
  productDialog.showModal();
}

function bindProductActions() {
  productsBody.querySelectorAll('[data-edit]').forEach((button) => button.addEventListener('click', () => openProduct(getProducts().find((product) => product.id === button.dataset.edit))));
  productsBody.querySelectorAll('[data-delete]').forEach((button) => button.addEventListener('click', () => {
    const products = getProducts();
    const product = products.find((item) => item.id === button.dataset.delete);
    if (!product || !window.confirm(`Delete ${product.name}?`)) return;
    saveProducts(products.filter((item) => item.id !== product.id));
    renderProducts();
    showToast('Product removed from the catalog');
  }));
  productsBody.querySelectorAll('[data-move]').forEach((button) => button.addEventListener('click', () => {
    const products = getProducts();
    const index = Number(button.dataset.index);
    const target = button.dataset.move === 'up' ? index - 1 : index + 1;
    if (target < 0 || target >= products.length) return;
    [products[index], products[target]] = [products[target], products[index]];
    saveProducts(products);
    renderProducts();
  }));
}

function renderSubmissions() {
  const submissions = readJson(SUBMISSIONS_KEY, []);
  document.querySelector('#submission-count').textContent = `${submissions.length} pending submission${submissions.length === 1 ? '' : 's'}`;
  document.querySelector('#admin-submissions').innerHTML = submissions.length ? submissions.map((submission) => `<article class="submission-item"><div><strong>${submission.name}</strong><span>${submission.seller} · ${submission.category} · $${submission.price}</span></div><span class="status-pill">${submission.status}</span></article>`).join('') : '<p class="empty-state">No seller submissions yet.</p>';
}

function formatOrderDate(date) {
  return new Date(date).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
}

async function renderOrders() {
  let orders = [];
  try {
    const response = await window.MorrowApi.apiRequest('/api/admin/orders');
    orders = Array.isArray(response.orders) ? response.orders : [];
  } catch (error) {
    document.querySelector('#order-count').textContent = 'Orders unavailable';
    document.querySelector('#admin-orders').innerHTML = `<p class="empty-state">${error.message}</p>`;
    return;
  }
  document.querySelector('#order-count').textContent = `${orders.length} order${orders.length === 1 ? '' : 's'}`;
  document.querySelector('#admin-orders').innerHTML = orders.length ? orders.map((order) => {
    const buyer = order.buyer || { name: 'Legacy order', email: 'No buyer details saved' };
    const receipt = order.receipt || {};
    const items = (order.items || []).map((item) => `${item.name} × ${item.quantity}`).join(', ');
    return `<article class="admin-order"><div class="admin-order-heading"><div><p class="eyebrow">${order.orderNumber || 'Order'}</p><h3>${buyer.name}</h3><span>${buyer.email}</span></div><strong>$${order.total}</strong></div><div class="admin-order-details"><span><b>Purchased</b>${formatOrderDate(order.date)}</span><span><b>Items</b>${items || 'No item details'}</span><span><b>Receipt</b>${receipt.receiptNumber || 'Not available'} · ${receipt.paymentMethod || 'Payment details unavailable'}${receipt.cardLast4 ? ` ending ${receipt.cardLast4}` : ''}</span><span><b>Ship to</b>${order.shipping ? `${order.shipping.address}, ${order.shipping.city}, ${order.shipping.postalCode}, ${order.shipping.country}` : 'No shipping details saved'}</span></div></article>`;
  }).join('') : '<p class="empty-state">No purchases yet.</p>';
}

function renderUsers() {
  const users = window.MorrowUsers.getAccounts();
  document.querySelector('#user-count').textContent = `${users.length} user${users.length === 1 ? '' : 's'}`;
  document.querySelector('#admin-users').innerHTML = users.length ? users.map((user) => `<article class="admin-user"><div><strong>${user.name || user.email}</strong><span>${user.email}</span><small>Joined ${formatOrderDate(user.createdAt)}</small></div><div class="admin-user-actions"><span class="status-pill ${user.status === 'active' ? 'is-live' : ''}">${user.status}</span><button type="button" data-user-action="${user.status === 'active' ? 'suspend' : 'activate'}" data-user-email="${user.email}">${user.status === 'active' ? 'Suspend' : 'Reactivate'}</button><button type="button" data-user-action="delete" data-user-email="${user.email}">Delete</button></div></article>`).join('') : '<p class="empty-state">No user accounts yet.</p>';
  document.querySelectorAll('[data-user-action]').forEach((button) => button.addEventListener('click', () => {
    const email = button.dataset.userEmail;
    const action = button.dataset.userAction;
    if (action === 'delete' && !window.confirm(`Delete the account for ${email}?`)) return;
    if (action === 'delete') window.MorrowUsers.deleteAccount(email);
    if (action === 'suspend') window.MorrowUsers.suspendAccount(email);
    if (action === 'activate') window.MorrowUsers.activateAccount(email);
    renderUsers();
    showToast(`User ${action === 'delete' ? 'deleted' : action === 'suspend' ? 'suspended' : 'reactivated'}`);
  }));
}

function renderActivity() {
  const activity = window.MorrowUsers.getActivity();
  document.querySelector('#activity-count').textContent = `${activity.length} event${activity.length === 1 ? '' : 's'}`;
  document.querySelector('#admin-activity').innerHTML = activity.length ? activity.map((event) => `<article class="admin-activity-item"><strong>${event.email}</strong><span>${event.type}</span><time>${formatOrderDate(event.date)}</time></article>`).join('') : '<p class="empty-state">No login activity yet.</p>';
}

productForm.addEventListener('submit', (event) => {
  event.preventDefault();
  const products = getProducts();
  const id = document.querySelector('#product-id').value || `product-${Date.now()}`;
  const product = {
    id,
    name: document.querySelector('#product-name').value.trim(),
    category: document.querySelector('#product-category').value,
    price: Number(document.querySelector('#product-price').value),
    description: document.querySelector('#product-description').value.trim(),
    image: document.querySelector('#product-image').value.trim(),
    imageAlt: document.querySelector('#product-name').value.trim(),
    meta: document.querySelector('#product-meta').value.trim(),
    tag: '',
    published: document.querySelector('#product-published').checked,
  };
  const existingIndex = products.findIndex((item) => item.id === id);
  if (existingIndex >= 0) products[existingIndex] = { ...products[existingIndex], ...product };
  else products.push(product);
  saveProducts(products);
  productDialog.close();
  renderProducts();
  showToast(existingIndex >= 0 ? 'Product updated' : 'Product added');
});

document.querySelector('#new-product').addEventListener('click', () => openProduct());
document.querySelector('#close-product-dialog').addEventListener('click', () => productDialog.close());
document.querySelector('#cancel-product').addEventListener('click', () => productDialog.close());
document.querySelector('#reset-catalog').addEventListener('click', () => {
  if (!window.confirm('Reset the catalog to the original demo products?')) return;
  saveProducts(defaultProducts);
  renderProducts();
  showToast('Demo catalog restored');
});
document.querySelectorAll('.workspace-tab').forEach((tab) => tab.addEventListener('click', () => {
  document.querySelectorAll('.workspace-tab').forEach((item) => item.classList.toggle('active', item === tab));
  document.querySelectorAll('[data-panel]').forEach((panel) => { panel.hidden = panel.dataset.panel !== tab.dataset.view; });
  if (tab.dataset.view === 'submissions') renderSubmissions();
  if (tab.dataset.view === 'orders') renderOrders();
  if (tab.dataset.view === 'users') renderUsers();
  if (tab.dataset.view === 'activity') renderActivity();
}));

renderProducts();
renderSubmissions();
renderOrders();
renderUsers();
renderActivity();
