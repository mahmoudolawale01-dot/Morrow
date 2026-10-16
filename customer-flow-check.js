require('dotenv').config();

const http = require('http');
const apiPort = Number(process.env.API_PORT) || 3001;

function request({ path, method = 'GET', body = null, cookie = '' }) {
  return new Promise((resolve, reject) => {
    const payload = body ? JSON.stringify(body) : null;
    const req = http.request({
      hostname: '127.0.0.1',
      port: apiPort,
      path,
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(cookie ? { Cookie: cookie } : {}),
      },
    }, (res) => {
      let raw = '';
      res.on('data', (chunk) => { raw += chunk; });
      res.on('end', () => {
        let parsed = raw;
        try { parsed = JSON.parse(raw); } catch {}
        resolve({ status: res.statusCode, headers: res.headers, body: parsed });
      });
    });

    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

(async () => {
  const email = `flow-${Date.now()}@example.com`;
  const registerRes = await request({
    path: '/api/auth/register',
    method: 'POST',
    body: {
      email,
      name: 'Flow User',
      password: 'password123',
    },
  });

  if (registerRes.status !== 201) {
    throw new Error(`Registration failed: ${JSON.stringify(registerRes.body)}`);
  }

  const cookie = registerRes.headers['set-cookie'][0].split(';')[0];

  const orderRes = await request({
    path: '/api/orders',
    method: 'POST',
    body: {
      items: [{ name: 'Arc bud vase', price: 1, quantity: 1 }],
      shipping: {
        address: '123 Main',
        city: 'Austin',
        postalCode: '78701',
        country: 'USA',
      },
      receipt: {
        paymentMethod: 'Card',
        cardLast4: '4242',
      },
    },
    cookie,
  });

  if (orderRes.status !== 201) {
    throw new Error(`Order creation failed: ${JSON.stringify(orderRes.body)}`);
  }
  if (orderRes.body.order?.total !== 68 || orderRes.body.order?.items?.[0]?.price !== 68) {
    throw new Error(`Server price validation failed: ${JSON.stringify(orderRes.body)}`);
  }

  const orderListRes = await request({
    path: '/api/orders',
    method: 'GET',
    cookie,
  });

  if (orderListRes.status !== 200) {
    throw new Error(`Order retrieval failed: ${JSON.stringify(orderListRes.body)}`);
  }

  const adminEmail = process.env.ADMIN_EMAIL || 'admin@morrow.local';
  const adminPassword = process.env.ADMIN_PASSWORD || 'morrow-admin';
  const adminLoginRes = await request({
    path: '/api/auth/login',
    method: 'POST',
    body: {
      email: adminEmail,
      password: adminPassword,
    },
  });

  if (adminLoginRes.status !== 200) {
    throw new Error(`Admin login failed: ${JSON.stringify(adminLoginRes.body)}`);
  }

  const adminCookie = adminLoginRes.headers['set-cookie'][0].split(';')[0];
  const mutationPreflightRes = await request({ path: '/api/admin/products/order', method: 'OPTIONS' });
  const allowedMethods = mutationPreflightRes.headers['access-control-allow-methods'] || '';
  if (mutationPreflightRes.status !== 204 || !allowedMethods.includes('PATCH') || !allowedMethods.includes('DELETE')) {
    throw new Error(`Admin product mutation CORS preflight failed: ${JSON.stringify(mutationPreflightRes.headers)}`);
  }

  const blockedExportRes = await request({ path: '/api/admin/export-data?type=vendors' });
  if (blockedExportRes.status !== 401) {
    throw new Error(`Export data should require admin access: ${JSON.stringify(blockedExportRes.body)}`);
  }

  const adminOrdersRes = await request({
    path: '/api/admin/orders',
    method: 'GET',
    cookie: adminCookie,
  });

  if (adminOrdersRes.status !== 200) {
    throw new Error(`Admin order access failed: ${JSON.stringify(adminOrdersRes.body)}`);
  }

  const anonymousProductsRes = await request({ path: '/api/admin/products' });
  if (anonymousProductsRes.status !== 401) {
    throw new Error(`Admin product management should require admin access: ${JSON.stringify(anonymousProductsRes.body)}`);
  }

  const initialAdminProductsRes = await request({ path: '/api/admin/products', cookie: adminCookie });
  if (initialAdminProductsRes.status !== 200 || !initialAdminProductsRes.body.products?.length) {
    throw new Error(`Admin product list failed: ${JSON.stringify(initialAdminProductsRes.body)}`);
  }

  const testProductName = `Flow Test Vessel ${Date.now()}`;
  const createProductRes = await request({
    path: '/api/admin/products',
    method: 'POST',
    body: {
      name: testProductName,
      category: 'ceramics',
      price: 24.5,
      description: 'Product created by the admin API flow check.',
      image: 'https://example.com/flow-test-vessel.jpg',
      imageAlt: testProductName,
      meta: 'Test stoneware',
      published: true,
    },
    cookie: adminCookie,
  });
  if (createProductRes.status !== 201) {
    throw new Error(`Admin product create failed: ${JSON.stringify(createProductRes.body)}`);
  }
  const testProductId = createProductRes.body.product?.id;
    const publicCreatedProductRes = await request({ path: `/api/products/${encodeURIComponent(testProductId)}` });
    if (publicCreatedProductRes.status !== 200 || publicCreatedProductRes.body.product?.price !== 24.5) {
      throw new Error(`Created admin product did not reach the public catalog: ${JSON.stringify(publicCreatedProductRes.body)}`);
    }
    const createdProductExportRes = await request({
      path: '/api/admin/export-data?type=products&category=ceramics',
      cookie: adminCookie,
    });
    if (createdProductExportRes.status !== 200 || !createdProductExportRes.body.records?.some((product) => product.id === testProductId)) {
      throw new Error(`Created admin product did not reach exports: ${JSON.stringify(createdProductExportRes.body)}`);
    }

  const updateProductRes = await request({
    path: `/api/admin/products/${encodeURIComponent(testProductId)}`,
    method: 'PATCH',
    body: {
      name: testProductName,
      category: 'ceramics',
      price: 29,
      description: 'Updated through the admin product API.',
      image: 'https://example.com/flow-test-vessel.jpg',
      imageAlt: testProductName,
      meta: 'Test stoneware',
      published: false,
    },
    cookie: adminCookie,
  });
  if (updateProductRes.status !== 200 || updateProductRes.body.product?.price !== 29 || updateProductRes.body.product?.published !== false) {
    throw new Error(`Admin product update failed: ${JSON.stringify(updateProductRes.body)}`);
  }

  const hiddenProductRes = await request({ path: `/api/products/${encodeURIComponent(testProductId)}` });
  if (hiddenProductRes.status !== 404) {
    throw new Error(`Unpublished product should not be public: ${JSON.stringify(hiddenProductRes.body)}`);
  }

  const productOrder = initialAdminProductsRes.body.products.map((product) => product.id);
  const reorderedProducts = [productOrder[1], productOrder[0], ...productOrder.slice(2), testProductId];
  const reorderRes = await request({
    path: '/api/admin/products/order',
    method: 'PATCH',
    body: { products: reorderedProducts },
    cookie: adminCookie,
  });
  const reorderedListRes = await request({ path: '/api/admin/products', cookie: adminCookie });
  if (reorderRes.status !== 200 || reorderedListRes.body.products?.[0]?.id !== productOrder[1]) {
    throw new Error(`Admin product ordering failed: ${JSON.stringify(reorderedListRes.body)}`);
  }

  const restoreOrderRes = await request({
    path: '/api/admin/products/order',
    method: 'PATCH',
    body: { products: [...productOrder, testProductId] },
    cookie: adminCookie,
  });
  if (restoreOrderRes.status !== 200) {
    throw new Error(`Admin product ordering restore failed: ${JSON.stringify(restoreOrderRes.body)}`);
  }

  const deleteProductRes = await request({
    path: `/api/admin/products/${encodeURIComponent(testProductId)}`,
    method: 'DELETE',
    cookie: adminCookie,
  });
  if (deleteProductRes.status !== 200) {
    throw new Error(`Admin product delete failed: ${JSON.stringify(deleteProductRes.body)}`);
  }

  const vendorEmail = `vendor-${Date.now()}@example.com`;
  const incompleteVendorRes = await request({
    path: '/api/auth/register',
    method: 'POST',
    body: {
      email: `incomplete-${vendorEmail}`,
      name: 'Incomplete Vendor',
      password: 'vendorpass123',
      role: 'vendor',
    },
  });
  if (incompleteVendorRes.status !== 400) {
    throw new Error(`Vendor signup should require phone and address: ${JSON.stringify(incompleteVendorRes.body)}`);
  }

  const adminSignupRes = await request({
    path: '/api/auth/register',
    method: 'POST',
    body: {
      email: `self-admin-${Date.now()}@example.com`,
      name: 'Self Admin',
      password: 'adminpass123',
      role: 'admin',
    },
  });
  if (adminSignupRes.status !== 400) {
    throw new Error(`Public signup must not allow admin role: ${JSON.stringify(adminSignupRes.body)}`);
  }

  const vendorRegisterRes = await request({
    path: '/api/auth/register',
    method: 'POST',
    body: {
      email: vendorEmail,
      name: 'Vendor User',
      phone: '+1 555 010 2020',
      address: '12 Market Street, Portland',
      password: 'vendorpass123',
      role: 'vendor',
    },
  });

  if (vendorRegisterRes.status !== 201) {
    throw new Error(`Vendor registration failed: ${JSON.stringify(vendorRegisterRes.body)}`);
  }
  if (vendorRegisterRes.body.user.phone !== '+1 555 010 2020' || vendorRegisterRes.body.user.address !== '12 Market Street, Portland') {
    throw new Error(`Vendor contact details were not persisted: ${JSON.stringify(vendorRegisterRes.body.user)}`);
  }

  const vendorExportRes = await request({
    path: `/api/admin/export-data?type=vendors&vendorId=${vendorRegisterRes.body.user.id}`,
    cookie: adminCookie,
  });
  const exportedVendor = vendorExportRes.body.records?.[0];
  if (vendorExportRes.status !== 200 || exportedVendor?.email !== vendorEmail || exportedVendor?.phone !== '+1 555 010 2020') {
    throw new Error(`Vendor export filtering failed: ${JSON.stringify(vendorExportRes.body)}`);
  }

  const productExportRes = await request({
    path: '/api/admin/export-data?type=products&category=ceramics&sort=category',
    cookie: adminCookie,
  });
  if (productExportRes.status !== 200 || !productExportRes.body.records?.length || productExportRes.body.records.some((product) => product.category !== 'ceramics')) {
    throw new Error(`Product type export filter failed: ${JSON.stringify(productExportRes.body)}`);
  }

  const dateRangeExportRes = await request({
    path: '/api/admin/export-data?type=products&from=2000-01-01&to=2000-01-02',
    cookie: adminCookie,
  });
  if (dateRangeExportRes.status !== 200 || dateRangeExportRes.body.records?.length !== 0) {
    throw new Error(`Product export date range failed: ${JSON.stringify(dateRangeExportRes.body)}`);
  }

  const vendorCookie = vendorRegisterRes.headers['set-cookie'][0].split(';')[0];
  const vendorSubmissionRes = await request({
    path: '/api/seller/submissions',
    method: 'POST',
    body: {
      seller: 'Vendor User',
      email: vendorEmail,
      name: 'Handwoven tray',
      category: 'textiles',
      price: 180,
      image: 'https://example.com/tray.jpg',
      description: 'A softly woven tray with natural fiber detailing.',
      material: 'Cotton and jute',
    },
    cookie: vendorCookie,
  });

  if (vendorSubmissionRes.status !== 201) {
    throw new Error(`Vendor submission failed: ${JSON.stringify(vendorSubmissionRes.body)}`);
  }

  const userListRes = await request({
    path: '/api/admin/users',
    method: 'GET',
    cookie: adminCookie,
  });

  if (userListRes.status !== 200) {
    throw new Error(`Admin user list failed: ${JSON.stringify(userListRes.body)}`);
  }

  const targetUser = userListRes.body.users.find((user) => user.email === email);
  if (!targetUser) {
    throw new Error('Expected created user not present in admin user list.');
  }

  const suspendRes = await request({
    path: `/api/admin/users/${targetUser.id}`,
    method: 'PATCH',
    body: { status: 'suspended' },
    cookie: adminCookie,
  });

  if (suspendRes.status !== 200) {
    throw new Error(`Admin suspend failed: ${JSON.stringify(suspendRes.body)}`);
  }

  const reactivateRes = await request({
    path: `/api/admin/users/${targetUser.id}`,
    method: 'PATCH',
    body: { status: 'active' },
    cookie: adminCookie,
  });

  if (reactivateRes.status !== 200) {
    throw new Error(`Admin reactivate failed: ${JSON.stringify(reactivateRes.body)}`);
  }

  const deleteRes = await request({
    path: `/api/admin/users/${targetUser.id}`,
    method: 'DELETE',
    cookie: adminCookie,
  });

  if (deleteRes.status !== 200) {
    throw new Error(`Admin delete failed: ${JSON.stringify(deleteRes.body)}`);
  }

  const submissionsListRes = await request({
    path: '/api/admin/submissions',
    method: 'GET',
    cookie: adminCookie,
  });

  if (submissionsListRes.status !== 200) {
    throw new Error(`Admin submissions list failed: ${JSON.stringify(submissionsListRes.body)}`);
  }

  const traySubmission = submissionsListRes.body.submissions?.find((s) => s.email === vendorEmail && s.name === 'Handwoven tray');
  if (!traySubmission) {
    throw new Error(`Expected submission for vendor not found: ${JSON.stringify(submissionsListRes.body)}`);
  }

  const unauthorizedReviewRes = await request({
    path: `/api/admin/submissions/${traySubmission.id}/approve`,
    method: 'POST',
  });
  if (unauthorizedReviewRes.status !== 401) {
    throw new Error(`Submission review must require admin authentication: ${JSON.stringify(unauthorizedReviewRes.body)}`);
  }

  const forbiddenReviewRes = await request({
    path: `/api/admin/submissions/${traySubmission.id}/approve`,
    method: 'POST',
    cookie: vendorCookie,
  });
  if (forbiddenReviewRes.status !== 403) {
    throw new Error(`Submission review must reject non-admin users: ${JSON.stringify(forbiddenReviewRes.body)}`);
  }

  const approveRes = await request({
    path: `/api/admin/submissions/${traySubmission.id}/approve`,
    method: 'POST',
    cookie: adminCookie,
  });
  if (approveRes.status !== 200 || !approveRes.body.ok || approveRes.body.submission?.status !== 'approved') {
    throw new Error(`Admin approve submission failed: ${JSON.stringify(approveRes.body)}`);
  }
  if (!approveRes.body.product?.vendor || approveRes.body.product?.vendor !== 'Vendor User') {
    throw new Error(`Approved product vendor was not set to the uploading vendor: ${JSON.stringify(approveRes.body.product)}`);
  }
  if (!approveRes.body.product?.createdAt) {
    throw new Error(`Approved product createdAt was not present: ${JSON.stringify(approveRes.body.product)}`);
  }

  const createdProductSlug = approveRes.body.product?.id || approveRes.body.submission?.productSlug;
  const publicCatalogCheck = await request({ path: `/api/products/${encodeURIComponent(createdProductSlug)}` });
  if (publicCatalogCheck.status !== 200 || publicCatalogCheck.body.product?.price !== 180 || publicCatalogCheck.body.product?.vendor !== 'Vendor User') {
    throw new Error(`Approved submission did not become available in catalog with vendor: ${JSON.stringify(publicCatalogCheck.body)}`);
  }

  const duplicateApproveRes = await request({
    path: `/api/admin/submissions/${traySubmission.id}/approve`,
    method: 'POST',
    cookie: adminCookie,
  });
  if (duplicateApproveRes.status !== 400) {
    throw new Error(`Approving already approved submission should return 400: ${JSON.stringify(duplicateApproveRes.body)}`);
  }

  const rejectApprovedRes = await request({
    path: `/api/admin/submissions/${traySubmission.id}/reject`,
    method: 'POST',
    cookie: adminCookie,
  });
  if (rejectApprovedRes.status !== 400) {
    throw new Error(`Rejecting already approved submission should return 400: ${JSON.stringify(rejectApprovedRes.body)}`);
  }

  const cleanupApprovedProductRes = await request({
    path: `/api/admin/products/${encodeURIComponent(createdProductSlug)}`,
    method: 'DELETE',
    cookie: adminCookie,
  });
  if (cleanupApprovedProductRes.status !== 200) {
    throw new Error(`Failed to clean up approved test product: ${JSON.stringify(cleanupApprovedProductRes.body)}`);
  }

  const rejectItemRes = await request({
    path: '/api/seller/submissions',
    method: 'POST',
    body: {
      seller: 'Vendor User',
      email: vendorEmail,
      name: 'Test Reject Piece',
      category: 'ceramics',
      price: 65,
      image: 'https://example.com/reject-piece.jpg',
      description: 'A piece submitted for rejection testing.',
      material: 'Clay',
    },
    cookie: vendorCookie,
  });
  if (rejectItemRes.status !== 201) {
    throw new Error(`Failed to create submission for reject testing: ${JSON.stringify(rejectItemRes.body)}`);
  }

  const updatedSubmissionsRes = await request({ path: '/api/admin/submissions', method: 'GET', cookie: adminCookie });
  const rejectTarget = updatedSubmissionsRes.body.submissions?.find((s) => s.email === vendorEmail && s.name === 'Test Reject Piece');
  if (!rejectTarget) {
    throw new Error('Test submission for rejection was not found');
  }

  const rejectRes = await request({
    path: `/api/admin/submissions/${rejectTarget.id}/reject`,
    method: 'POST',
    body: { reason: 'Does not meet material standards.' },
    cookie: adminCookie,
  });
  if (rejectRes.status !== 200 || !rejectRes.body.ok || rejectRes.body.submission?.status !== 'rejected') {
    throw new Error(`Admin reject submission failed: ${JSON.stringify(rejectRes.body)}`);
  }

  const sellerListRes = await request({
    path: '/api/seller/submissions',
    method: 'GET',
    cookie: vendorCookie,
  });
  const sellerRejectedItem = sellerListRes.body.submissions?.find((s) => s.id === rejectTarget.id);
  if (!sellerRejectedItem || sellerRejectedItem.status !== 'rejected' || sellerRejectedItem.reason !== 'Does not meet material standards.') {
    throw new Error(`Seller does not see rejection status or reason: ${JSON.stringify(sellerListRes.body)}`);
  }

  const notFoundReviewRes = await request({
    path: '/api/admin/submissions/99999999/approve',
    method: 'POST',
    cookie: adminCookie,
  });
  if (notFoundReviewRes.status !== 404) {
    throw new Error(`Non-existent submission review should return 404: ${JSON.stringify(notFoundReviewRes.body)}`);
  }

  console.log('register status:', registerRes.status);
  console.log('order status:', orderRes.status);
  console.log('list status:', orderListRes.status);
  console.log('order count:', Array.isArray(orderListRes.body.orders) ? orderListRes.body.orders.length : 0);
  console.log('admin login status:', adminLoginRes.status);
  console.log('admin product mutation preflight:', mutationPreflightRes.status, allowedMethods);
  console.log('unauthorized export status:', blockedExportRes.status);
  console.log('admin orders status:', adminOrdersRes.status);
  console.log('admin product list count:', initialAdminProductsRes.body.products.length);
  console.log('admin product create status:', createProductRes.status);
  console.log('public catalog create visibility:', publicCreatedProductRes.status);
  console.log('product export create visibility:', createdProductExportRes.status);
  console.log('admin product update status:', updateProductRes.status);
  console.log('hidden product public status:', hiddenProductRes.status);
  console.log('admin product reorder status:', reorderRes.status);
  console.log('admin product delete status:', deleteProductRes.status);
  console.log('vendor register status:', vendorRegisterRes.status);
  console.log('vendor export status:', vendorExportRes.status);
  console.log('product export status:', productExportRes.status);
  console.log('date range export status:', dateRangeExportRes.status);
  console.log('vendor submission status:', vendorSubmissionRes.status);
  console.log('admin users status:', userListRes.status);
  console.log('admin user update status:', reactivateRes.status);
  console.log('admin user delete status:', deleteRes.status);
  console.log('admin submissions status:', submissionsListRes.status);
  console.log('unauthorized review status:', unauthorizedReviewRes.status);
  console.log('forbidden review status:', forbiddenReviewRes.status);
  console.log('admin approve submission status:', approveRes.status);
  console.log('approved product public visibility:', publicCatalogCheck.status);
  console.log('prevent duplicate approve status:', duplicateApproveRes.status);
  console.log('prevent reject approved status:', rejectApprovedRes.status);
  console.log('admin reject submission status:', rejectRes.status);
  console.log('seller sees rejection reason:', sellerRejectedItem?.reason === 'Does not meet material standards.' ? 'ok' : 'mismatch');
  console.log('invalid submission 404 check:', notFoundReviewRes.status);
})();
