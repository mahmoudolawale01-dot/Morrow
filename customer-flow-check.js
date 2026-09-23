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

  console.log('register status:', registerRes.status);
  console.log('order status:', orderRes.status);
  console.log('list status:', orderListRes.status);
  console.log('order count:', Array.isArray(orderListRes.body.orders) ? orderListRes.body.orders.length : 0);
})();
