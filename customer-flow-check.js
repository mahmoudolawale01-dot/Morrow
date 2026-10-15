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

  console.log('register status:', registerRes.status);
  console.log('order status:', orderRes.status);
  console.log('list status:', orderListRes.status);
  console.log('order count:', Array.isArray(orderListRes.body.orders) ? orderListRes.body.orders.length : 0);
  console.log('admin login status:', adminLoginRes.status);
  console.log('unauthorized export status:', blockedExportRes.status);
  console.log('admin orders status:', adminOrdersRes.status);
  console.log('vendor register status:', vendorRegisterRes.status);
  console.log('vendor export status:', vendorExportRes.status);
  console.log('product export status:', productExportRes.status);
  console.log('date range export status:', dateRangeExportRes.status);
  console.log('vendor submission status:', vendorSubmissionRes.status);
  console.log('admin users status:', userListRes.status);
  console.log('admin user update status:', reactivateRes.status);
  console.log('admin user delete status:', deleteRes.status);
  console.log('admin submissions status:', submissionsListRes.status);
})();
