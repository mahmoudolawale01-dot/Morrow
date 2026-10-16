const PRODUCTS_KEY = 'morrow-admin-products';
const PRODUCT_MIGRATION_KEY = 'morrow-admin-products-server-migrated';
const ADMIN_LOCAL_ACCOUNT_KEY = 'morrow-admin-account';
const ADMIN_LOCAL_SESSION_KEY = 'morrow-admin-session';
let adminProducts = [];
const productDialog = document.querySelector('#product-dialog');
const productForm = document.querySelector('#product-form');
const productsBody = document.querySelector('#admin-products');
const toast = document.querySelector('.toast');
const exportDialog = document.querySelector('#export-dialog');
const exportForm = document.querySelector('#export-form');
const exportType = document.querySelector('#export-type');
const exportSort = document.querySelector('#export-sort');
const exportVendor = document.querySelector('#export-vendor');
const exportCategory = document.querySelector('#export-category');
const exportMessage = document.querySelector('#export-message');
const exportButton = document.querySelector('#download-export');

async function isAdminAuthenticated() {
  if (window.MorrowApi) {
    try {
      const response = await window.MorrowApi.apiRequest('/api/auth/me');
      return response.user?.role === 'admin';
    } catch {
      // The browser-local session is still accepted as a fallback when the API session is not active.
    }
  }

  try {
    const account = JSON.parse(localStorage.getItem(ADMIN_LOCAL_ACCOUNT_KEY));
    return sessionStorage.getItem(ADMIN_LOCAL_SESSION_KEY) === 'authenticated' && Boolean(account);
  } catch {
    return false;
  }
}

function readJson(key, fallback) {
  try {
    return JSON.parse(localStorage.getItem(key)) || fallback;
  } catch {
    return fallback;
  }
}

function getProducts() {
  return adminProducts;
}

function showToast(message) {
  toast.textContent = message;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 2400);
}

async function migrateLegacyProducts() {
  if (localStorage.getItem(PRODUCT_MIGRATION_KEY) === 'complete') return;

  const legacyProducts = readJson(PRODUCTS_KEY, []);
  if (Array.isArray(legacyProducts)) {
    for (const legacyProduct of legacyProducts) {
      if (!legacyProduct?.name) continue;
      const product = {
        name: legacyProduct.name,
        category: legacyProduct.category || 'ceramics',
        price: Number(legacyProduct.price) || 0,
        description: legacyProduct.description || legacyProduct.name,
        image: legacyProduct.image || legacyProduct.imageUrl || '',
        imageAlt: legacyProduct.imageAlt || legacyProduct.name,
        meta: legacyProduct.meta || 'Not specified',
        tag: legacyProduct.tag || '',
        published: legacyProduct.published !== false,
      };
      const existing = adminProducts.find((item) => item.id === legacyProduct.id);
      const path = existing
        ? `/api/admin/products/${encodeURIComponent(existing.id)}`
        : '/api/admin/products';
      const response = await window.MorrowApi.apiRequest(path, {
        method: existing ? 'PATCH' : 'POST',
        body: JSON.stringify(product),
      });
      if (existing) Object.assign(existing, response.product);
      else adminProducts.push(response.product);
    }
  }

  localStorage.setItem(PRODUCT_MIGRATION_KEY, 'complete');
  localStorage.removeItem(PRODUCTS_KEY);
}

async function renderProducts() {
  try {
    const response = await window.MorrowApi.apiRequest('/api/admin/products');
    adminProducts = Array.isArray(response.products) ? response.products : [];
    await migrateLegacyProducts();
    if (localStorage.getItem(PRODUCT_MIGRATION_KEY) === 'complete' && adminProducts.length) {
      const refreshed = await window.MorrowApi.apiRequest('/api/admin/products');
      adminProducts = Array.isArray(refreshed.products) ? refreshed.products : adminProducts;
    }
  } catch (error) {
    document.querySelector('#product-count').textContent = 'Products unavailable';
    productsBody.innerHTML = `<tr><td colspan="6">${error.message || 'Unable to load products.'}</td></tr>`;
    return;
  }

  const products = getProducts();
  document.querySelector('#product-count').textContent = `${products.length} product${products.length === 1 ? '' : 's'}`;
  productsBody.innerHTML = products.map((product, index) => {
    const vendorName = product.vendor || 'Morrow';
    const uploadTime = formatOrderDate(product.createdAt);
    return `
    <tr>
      <td><strong>${product.name}</strong><span class="table-subtext">${product.meta}</span></td>
      <td>${product.category}</td>
      <td>$${product.price}</td>
      <td><span class="status-pill ${product.published ? 'is-live' : ''}">${product.published ? 'Published' : 'Hidden'}</span></td>
      <td><div class="order-controls"><button type="button" data-move="up" data-index="${index}" aria-label="Move ${product.name} up">↑</button><button type="button" data-move="down" data-index="${index}" aria-label="Move ${product.name} down">↓</button></div></td>
      <td>
        <div class="row-actions">
          <button type="button" data-edit="${product.id}" title="Uploaded by ${vendorName} on ${uploadTime}">Edit</button>
          <button type="button" data-delete="${product.id}">Delete</button>
        </div>
        <div class="table-subtext" style="margin-top: 6px; font-size: 11px; line-height: 1.4;">
          <span><strong>Vendor:</strong> ${vendorName}</span><br />
          <span><strong>Uploaded:</strong> ${uploadTime}</span>
        </div>
      </td>
    </tr>`;
  }).join('');
  bindProductActions();
}

function setField(id, value) {
  document.querySelector(`#${id}`).value = value ?? '';
}

function openProduct(product) {
  document.querySelector('#form-title').textContent = product ? 'Edit product' : 'Add product';
  const uploadInfo = document.querySelector('#product-upload-info');
  if (uploadInfo) {
    if (product) {
      uploadInfo.textContent = `Uploaded by ${product.vendor || 'Morrow'} on ${formatOrderDate(product.createdAt)}`;
      uploadInfo.hidden = false;
    } else {
      uploadInfo.textContent = '';
      uploadInfo.hidden = true;
    }
  }
  setField('product-id', product?.id);
  setField('product-name', product?.name);
  setField('product-category', product?.category || 'ceramics');
  setField('product-price', product?.price);
  setField('product-description', product?.description);
  setField('product-image', product?.image);
  setField('product-meta', product?.meta);
  setField('product-vendor', product?.vendor || (product ? 'Morrow' : ''));
  document.querySelector('#product-published').checked = product?.published !== false;
  productDialog.showModal();
}

function bindProductActions() {
  productsBody.querySelectorAll('[data-edit]').forEach((button) => button.addEventListener('click', () => openProduct(getProducts().find((product) => product.id === button.dataset.edit))));
  productsBody.querySelectorAll('[data-delete]').forEach((button) => button.addEventListener('click', async () => {
    const products = getProducts();
    const product = products.find((item) => item.id === button.dataset.delete);
    if (!product || !window.confirm(`Delete ${product.name}?`)) return;
    try {
      await window.MorrowApi.apiRequest(`/api/admin/products/${encodeURIComponent(product.id)}`, { method: 'DELETE' });
      await renderProducts();
      showToast('Product removed from the catalog');
    } catch (error) {
      showToast(error.message || 'Unable to delete product');
    }
  }));
  productsBody.querySelectorAll('[data-move]').forEach((button) => button.addEventListener('click', async () => {
    const products = getProducts();
    const index = Number(button.dataset.index);
    const target = button.dataset.move === 'up' ? index - 1 : index + 1;
    if (target < 0 || target >= products.length) return;
    [products[index], products[target]] = [products[target], products[index]];
    try {
      await window.MorrowApi.apiRequest('/api/admin/products/order', {
        method: 'PATCH',
        body: JSON.stringify({ products: products.map((product) => product.id) }),
      });
      await renderProducts();
    } catch (error) {
      showToast(error.message || 'Unable to reorder products');
      await renderProducts();
    }
  }));
}

async function renderSubmissions() {
  if (!(await isAdminAuthenticated())) {
    document.querySelector('#submission-count').textContent = '0 pending submissions';
    document.querySelector('#admin-submissions').innerHTML = '<p class="empty-state">Sign in to view seller submissions.</p>';
    return;
  }

  try {
    const response = await window.MorrowApi.apiRequest('/api/admin/submissions');
    const submissions = Array.isArray(response.submissions) ? response.submissions : [];
    const pendingCount = submissions.filter((item) => item.status === 'pending').length;
    document.querySelector('#submission-count').textContent = `${pendingCount} pending submission${pendingCount === 1 ? '' : 's'}`;
    document.querySelector('#admin-submissions').innerHTML = submissions.length ? submissions.map((submission) => {
      const isApproved = submission.status === 'approved';
      const isPending = submission.status === 'pending';
      const isRejected = submission.status === 'rejected';
      return `
        <article class="submission-item" data-submission-id="${submission.id}">
          <div>
            <strong>${submission.name}</strong>
            <span>${submission.seller} · ${submission.category} · $${submission.price}</span>
            ${submission.reason ? `<span class="table-subtext" style="color: #a24936;">Rejection note: ${submission.reason}</span>` : ''}
            ${submission.productSlug ? `<span class="table-subtext">Catalog slug: ${submission.productSlug}</span>` : ''}
          </div>
          <div class="row-actions" style="align-items: center; gap: 8px;">
            <span class="status-pill ${isApproved ? 'is-live' : ''}" ${isRejected ? 'style="color: #a24936;"' : ''}>${submission.status}</span>
            ${isPending ? `
              <button type="button" data-submission-action="approve" data-submission-id="${submission.id}">Approve</button>
              <button type="button" data-submission-action="reject" data-submission-id="${submission.id}" style="color: #a24936;">Reject</button>
            ` : ''}
            ${isApproved && submission.productSlug ? `
              <a href="product.html?product=${encodeURIComponent(submission.productSlug)}" target="_blank" class="workspace-store-link" style="font-size: 11px;">View item ↗</a>
            ` : ''}
          </div>
        </article>
      `;
    }).join('') : '<p class="empty-state">No seller submissions yet.</p>';

    document.querySelectorAll('[data-submission-action]').forEach((button) => {
      button.addEventListener('click', async () => {
        const submissionId = button.dataset.submissionId;
        const action = button.dataset.submissionAction;
        try {
          if (action === 'approve') {
            if (!window.confirm('Approve this submission and add it to the live store catalog?')) return;
            button.disabled = true;
            await window.MorrowApi.apiRequest(`/api/admin/submissions/${submissionId}/approve`, { method: 'POST' });
            showToast('Submission approved and added to catalog');
          } else if (action === 'reject') {
            const reason = window.prompt('Enter an optional reason for rejecting this submission:');
            if (reason === null) return;
            button.disabled = true;
            await window.MorrowApi.apiRequest(`/api/admin/submissions/${submissionId}/reject`, {
              method: 'POST',
              body: JSON.stringify({ reason }),
            });
            showToast('Submission rejected');
          }
          await renderSubmissions();
          await renderProducts();
        } catch (error) {
          showToast(error.message);
          button.disabled = false;
        }
      });
    });
  } catch (error) {
    document.querySelector('#submission-count').textContent = 'Submissions unavailable';
    document.querySelector('#admin-submissions').innerHTML = `<p class="empty-state">${error.message}</p>`;
  }
}

function formatOrderDate(date) {
  return new Date(date).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
}

async function renderOrders() {
  if (!(await isAdminAuthenticated())) {
    document.querySelector('#order-count').textContent = '0 orders';
    document.querySelector('#admin-orders').innerHTML = '<p class="empty-state">Sign in to view purchase history.</p>';
    return;
  }

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

async function renderUsers() {
  if (!(await isAdminAuthenticated())) {
    document.querySelector('#user-count').textContent = '0 users';
    document.querySelector('#admin-users').innerHTML = '<p class="empty-state">Sign in to view account directory.</p>';
    return;
  }

  let users = [];
  try {
    const response = await window.MorrowApi.apiRequest('/api/admin/users');
    users = Array.isArray(response.users) ? response.users : [];
  } catch (error) {
    document.querySelector('#user-count').textContent = 'Users unavailable';
    document.querySelector('#admin-users').innerHTML = `<p class="empty-state">${error.message}</p>`;
    return;
  }

  document.querySelector('#user-count').textContent = `${users.length} user${users.length === 1 ? '' : 's'}`;
  document.querySelector('#admin-users').innerHTML = users.length ? users.map((user) => `<article class="admin-user"><div><strong>${user.name || user.email}</strong><span>${user.email}</span><small>Joined ${formatOrderDate(user.createdAt)}</small></div><div class="admin-user-actions"><span class="status-pill ${user.status === 'active' ? 'is-live' : ''}">${user.status}</span><button type="button" data-user-action="${user.status === 'active' ? 'suspend' : 'activate'}" data-user-id="${user.id}">${user.status === 'active' ? 'Suspend' : 'Reactivate'}</button><button type="button" data-user-action="delete" data-user-id="${user.id}">Delete</button></div></article>`).join('') : '<p class="empty-state">No user accounts yet.</p>';

  document.querySelectorAll('[data-user-action]').forEach((button) => {
    button.addEventListener('click', async () => {
      const userId = button.dataset.userId;
      const action = button.dataset.userAction;
      try {
        if (action === 'delete') {
          if (!window.confirm('Delete this account?')) return;
          await window.MorrowApi.apiRequest(`/api/admin/users/${userId}`, { method: 'DELETE' });
          showToast('User deleted');
        } else {
          const nextStatus = action === 'suspend' ? 'suspended' : 'active';
          await window.MorrowApi.apiRequest(`/api/admin/users/${userId}`, {
            method: 'PATCH',
            body: JSON.stringify({ status: nextStatus }),
          });
          showToast(`User ${nextStatus === 'suspended' ? 'suspended' : 'reactivated'}`);
        }
        await renderUsers();
      } catch (error) {
        showToast(error.message);
      }
    });
  });
}

function updateExportControls() {
  const type = exportType.value;
  document.querySelector('#export-vendor-filter-wrap').hidden = type !== 'vendors';
  document.querySelector('#export-category-filter-wrap').hidden = type !== 'products';

  const sortOptions = {
    users: [['date', 'Registration date'], ['name', 'Name']],
    vendors: [['date', 'Registration date'], ['vendor', 'Vendor name']],
    products: [['name', 'Product name'], ['category', 'Product type'], ['date', 'Date added']],
  };
  exportSort.innerHTML = sortOptions[type].map(([value, label]) => `<option value="${value}">${label}</option>`).join('');
}

async function loadExportVendors() {
  if (exportVendor.options.length > 1) return;

  try {
    const response = await window.MorrowApi.apiRequest('/api/admin/export-data?type=vendors');
    const vendors = Array.isArray(response.records) ? response.records : [];
    exportVendor.innerHTML = '<option value="">All vendors</option>' + vendors.map((vendor) => `<option value="${vendor.id}">${vendor.name} (${vendor.email})</option>`).join('');
  } catch (error) {
    exportMessage.textContent = error.message || 'Unable to load vendor filters.';
  }
}

function getExportColumns(type) {
  const dateStyle = { numFmt: 'yyyy-mm-dd hh:mm' };
  const columns = {
    users: [
      { header: 'Name', key: 'name', width: 26 },
      { header: 'Email', key: 'email', width: 32 },
      { header: 'Status', key: 'status', width: 16 },
      { header: 'Registered', key: 'createdAt', width: 22, style: dateStyle },
    ],
    vendors: [
      { header: 'Vendor', key: 'name', width: 26 },
      { header: 'Email', key: 'email', width: 32 },
      { header: 'Phone', key: 'phone', width: 20 },
      { header: 'Address', key: 'address', width: 42 },
      { header: 'Status', key: 'status', width: 16 },
      { header: 'Joined', key: 'createdAt', width: 22, style: dateStyle },
    ],
    products: [
      { header: 'Product', key: 'name', width: 28 },
      { header: 'Product type', key: 'category', width: 18 },
      { header: 'Price', key: 'price', width: 14, style: { numFmt: '$#,##0.00' } },
      { header: 'Description', key: 'description', width: 54 },
      { header: 'Material', key: 'material', width: 30 },
      { header: 'Image URL', key: 'image', width: 52 },
      { header: 'Published', key: 'published', width: 14 },
      { header: 'Date added', key: 'createdAt', width: 22, style: dateStyle },
    ],
  };
  return columns[type];
}

function toExcelDate(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

async function downloadAdminExport() {
  exportMessage.textContent = '';
  exportButton.disabled = true;

  try {
    if (!window.ExcelJS) throw new Error('Excel export is unavailable. Reload the admin page and try again.');

    const type = exportType.value;
    const params = new URLSearchParams({ type, sort: exportSort.value });
    const from = document.querySelector('#export-from').value;
    const to = document.querySelector('#export-to').value;
    if (from) params.set('from', from);
    if (to) params.set('to', to);
    if (type === 'vendors' && exportVendor.value) params.set('vendorId', exportVendor.value);
    if (type === 'products' && exportCategory.value) params.set('category', exportCategory.value);

    const response = await window.MorrowApi.apiRequest(`/api/admin/export-data?${params.toString()}`);
    const records = Array.isArray(response.records) ? response.records : [];
    const workbook = new window.ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet(type.charAt(0).toUpperCase() + type.slice(1));
    worksheet.columns = getExportColumns(type);
    worksheet.addRows(records.map((record) => ({ ...record, createdAt: toExcelDate(record.createdAt) })));
    worksheet.views = [{ state: 'frozen', ySplit: 1 }];
    worksheet.autoFilter = {
      from: 'A1',
      to: `${String.fromCharCode(64 + worksheet.columns.length)}${Math.max(1, records.length + 1)}`,
    };
    worksheet.getRow(1).font = { bold: true, color: { argb: 'FF20211D' } };
    worksheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF4F0E8' } };

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const downloadUrl = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = `morrow-${type}-${new Date().toISOString().slice(0, 10)}.xlsx`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(downloadUrl), 1000);
    exportMessage.textContent = `${records.length} record${records.length === 1 ? '' : 's'} exported.`;
  } catch (error) {
    exportMessage.textContent = error.message || 'Unable to create this export.';
  } finally {
    exportButton.disabled = false;
  }
}

document.querySelector('#open-export-dialog').addEventListener('click', async () => {
  exportMessage.textContent = '';
  updateExportControls();
  exportDialog.showModal();
  if (exportType.value === 'vendors') await loadExportVendors();
});
exportType.addEventListener('change', async () => {
  updateExportControls();
  if (exportType.value === 'vendors') await loadExportVendors();
});
exportForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  await downloadAdminExport();
});
document.querySelector('#close-export-dialog').addEventListener('click', () => exportDialog.close());
document.querySelector('#cancel-export').addEventListener('click', () => exportDialog.close());

async function renderActivity() {
  if (!(await isAdminAuthenticated())) {
    document.querySelector('#activity-count').textContent = '0 events';
    document.querySelector('#admin-activity').innerHTML = '<p class="empty-state">Sign in to view access logs.</p>';
    return;
  }

  const activity = window.MorrowUsers.getActivity();
  document.querySelector('#activity-count').textContent = `${activity.length} event${activity.length === 1 ? '' : 's'}`;
  document.querySelector('#admin-activity').innerHTML = activity.length ? activity.map((event) => `<article class="admin-activity-item"><strong>${event.email}</strong><span>${event.type}</span><time>${formatOrderDate(event.date)}</time></article>`).join('') : '<p class="empty-state">No login activity yet.</p>';
}

productForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const id = document.querySelector('#product-id').value;
  const product = {
    name: document.querySelector('#product-name').value.trim(),
    category: document.querySelector('#product-category').value,
    price: Number(document.querySelector('#product-price').value),
    description: document.querySelector('#product-description').value.trim(),
    image: document.querySelector('#product-image').value.trim(),
    imageAlt: document.querySelector('#product-name').value.trim(),
    meta: document.querySelector('#product-meta').value.trim(),
    vendor: document.querySelector('#product-vendor')?.value.trim() || 'Morrow',
    tag: '',
    published: document.querySelector('#product-published').checked,
  };
  try {
    await window.MorrowApi.apiRequest(id ? `/api/admin/products/${encodeURIComponent(id)}` : '/api/admin/products', {
      method: id ? 'PATCH' : 'POST',
      body: JSON.stringify(product),
    });
    productDialog.close();
    await renderProducts();
    showToast(id ? 'Product updated' : 'Product added');
  } catch (error) {
    showToast(error.message || 'Unable to save product');
  }
});

document.querySelector('#new-product').addEventListener('click', () => openProduct());
document.querySelector('#close-product-dialog').addEventListener('click', () => productDialog.close());
document.querySelector('#cancel-product').addEventListener('click', () => productDialog.close());
document.querySelector('#reset-catalog').addEventListener('click', async () => {
  if (!window.confirm('Reset the catalog to the original demo products?')) return;
  try {
    const response = await window.MorrowApi.apiRequest('/api/admin/products/reset', { method: 'POST' });
    adminProducts = Array.isArray(response.products) ? response.products : [];
    await renderProducts();
    showToast('Demo catalog restored');
  } catch (error) {
    showToast(error.message || 'Unable to reset the catalog');
  }
});
document.querySelectorAll('.workspace-tab').forEach((tab) => tab.addEventListener('click', () => {
  document.querySelectorAll('.workspace-tab').forEach((item) => item.classList.toggle('active', item === tab));
  document.querySelectorAll('[data-panel]').forEach((panel) => { panel.hidden = panel.dataset.panel !== tab.dataset.view; });
  if (tab.dataset.view === 'submissions') renderSubmissions();
  if (tab.dataset.view === 'orders') renderOrders();
  if (tab.dataset.view === 'users') renderUsers();
  if (tab.dataset.view === 'activity') renderActivity();
}));

async function refreshAdminDashboard() {
  await renderProducts();
  await renderSubmissions();
  await renderOrders();
  await renderUsers();
  await renderActivity();
}

document.addEventListener('morrow-admin-auth-change', () => {
  refreshAdminDashboard();
});
