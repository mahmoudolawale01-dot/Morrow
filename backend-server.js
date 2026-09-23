const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const childProcess = require('child_process');

const rootDirectory = path.resolve(__dirname);
const schemaPath = path.join(rootDirectory, 'database', 'schema.sql');
const databasePath = path.join(rootDirectory, 'database', 'morrow.sqlite');
const sqlitePath = process.env.SQLITE_PATH || path.join(process.env.LOCALAPPDATA, 'Microsoft', 'WinGet', 'Packages', 'SQLite.SQLite_Microsoft.Winget.Source_8wekyb3d8bbwe', 'sqlite3.exe');
const port = Number(process.env.API_PORT) || 3001;
const host = '127.0.0.1';
const seedProducts = [
  ['arc-bud-vase', 'Arc bud vase', 'A softly sculptural bud vase, hand-thrown and finished with a quiet speckle glaze.', 'ceramics', 6800, 'https://images.unsplash.com/photo-1610701596007-11502861dcfa?auto=format&fit=crop&w=800&q=85', 'Sculptural stoneware bud vase', 'Speckled stoneware', 'New', 1],
  ['daybreak-throw', 'Daybreak throw', 'A generous washed linen throw with a weight that makes every corner feel warmer.', 'textiles', 12400, 'https://images.unsplash.com/photo-1528459105426-b9548367069b?auto=format&fit=crop&w=800&q=85', 'Natural linen throw blanket', 'Washed European linen', 'Bestseller', 2],
  ['halo-table-lamp', 'Halo table lamp', 'A warm amber glow in recycled glass, grounded by a brushed brass base.', 'lighting', 19600, 'https://images.unsplash.com/photo-1494438639946-1ebd1d20bf85?auto=format&fit=crop&w=800&q=85', 'Amber glass table lamp', 'Recycled glass + brass', 'Limited', 3],
  ['stone-vessel', 'Stone vessel', 'A rounded vessel with a matte finish, made for single stems or standing alone.', 'ceramics', 8400, 'https://images.unsplash.com/photo-1578749556568-bc2c40e68b61?auto=format&fit=crop&w=800&q=85', 'Matte ceramic vessel', 'Matte stoneware', '', 4],
  ['linen-cushion', 'Linen cushion', 'A relaxed linen cushion with a soft, lived-in texture from day one.', 'textiles', 5600, 'https://images.unsplash.com/photo-1584100936595-c0654b55a2e2?auto=format&fit=crop&w=800&q=85', 'Natural linen cushion', 'Washed linen', 'New', 5],
  ['pendant-light', 'Pendant light', 'A hand-blown glass pendant that casts a warm, diffused light.', 'lighting', 22000, 'https://images.unsplash.com/photo-1524484485831-a92ffc0de03f?auto=format&fit=crop&w=800&q=85', 'Hand-blown glass pendant light', 'Hand-blown glass', '', 6],
  ['serving-bowl', 'Serving bowl', 'A wide, low bowl with a subtle speckle, made for sharing.', 'ceramics', 9200, 'https://images.unsplash.com/photo-1610701596061-2ecf227e85b2?auto=format&fit=crop&w=800&q=85', 'Speckled ceramic serving bowl', 'Stoneware', 'Bestseller', 7],
  ['wool-throw', 'Wool throw', 'A chunky wool throw with a hand-knitted texture, perfect for cooler evenings.', 'textiles', 14800, 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&w=800&q=85', 'Chunky wool throw blanket', 'Chunky wool', '', 8],
  ['desk-lamp', 'Desk lamp', 'A minimal desk lamp with an adjustable arm and warm brass accents.', 'lighting', 16800, 'https://images.unsplash.com/photo-1507473885765-e6ed057f782c?auto=format&fit=crop&w=800&q=85', 'Minimal brass + steel desk lamp', 'Brass + steel', 'Limited', 9],
];

function sendJson(response, statusCode, payload, headers = {}) {
  response.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': 'http://127.0.0.1:3000',
    'Access-Control-Allow-Credentials': 'true',
    ...headers,
  });
  response.end(JSON.stringify(payload));
}

function sqlValue(value) {
  return `'${String(value ?? '').replace(/'/g, "''")}'`;
}

function runSql(sql) {
  const output = childProcess.execFileSync(sqlitePath, [databasePath, '-json', sql], { encoding: 'utf8' }).trim();
  return output ? JSON.parse(output) : [];
}

function initializeDatabase() {
  const schema = fs.readFileSync(schemaPath, 'utf8');
  childProcess.execFileSync(sqlitePath, [databasePath], { input: schema, encoding: 'utf8' });
  const productColumns = runSql('PRAGMA table_info(products);').map((column) => column.name);
  if (!productColumns.includes('slug')) {
    childProcess.execFileSync(sqlitePath, [databasePath], { input: 'ALTER TABLE products RENAME TO products_legacy;', encoding: 'utf8' });
    childProcess.execFileSync(sqlitePath, [databasePath], { input: schema, encoding: 'utf8' });
  }
  for (const product of seedProducts) {
    runSql(`INSERT OR IGNORE INTO products (slug, name, description, category, price_cents, image_url, image_alt, meta, tag, sort_order) VALUES (${product.map(sqlValue).join(', ')});`);
  }
}

function readBody(request) {
  return new Promise((resolve, reject) => {
    let body = '';
    request.on('data', (chunk) => { body += chunk; if (body.length > 10000) request.destroy(); });
    request.on('end', () => {
      try { resolve(body ? JSON.parse(body) : {}); } catch { reject(new Error('Invalid JSON')); }
    });
    request.on('error', reject);
  });
}

function getCookies(request) {
  return Object.fromEntries((request.headers.cookie || '').split(';').filter(Boolean).map((part) => {
    const [key, ...value] = part.trim().split('=');
    return [key, value.join('=')];
  }));
}

function hashPassword(password, salt = crypto.randomBytes(16).toString('hex')) {
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

function passwordsMatch(password, storedHash) {
  const [salt, expected] = String(storedHash).split(':');
  if (!salt || !expected) return false;
  const actual = crypto.scryptSync(password, salt, 64).toString('hex');
  return crypto.timingSafeEqual(Buffer.from(actual, 'hex'), Buffer.from(expected, 'hex'));
}

function createSession(userId, email) {
  const token = crypto.randomBytes(32).toString('hex');
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  runSql(`INSERT INTO sessions (user_id, token_hash, expires_at) VALUES (${Number(userId)}, ${sqlValue(tokenHash)}, datetime('now', '+7 days')); INSERT INTO login_activity (user_id, email, event_type) VALUES (${Number(userId)}, ${sqlValue(email)}, 'login_success');`);
  return token;
}

function getSessionUser(request) {
  const token = getCookies(request).morrow_session;
  if (!token) return null;
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  return runSql(`SELECT users.id, users.email, users.name, users.role, users.status, sessions.created_at AS signed_in_at FROM sessions JOIN users ON users.id = sessions.user_id WHERE sessions.token_hash = ${sqlValue(tokenHash)} AND sessions.revoked_at IS NULL AND sessions.expires_at > datetime('now') AND users.status = 'active' LIMIT 1;`)[0] || null;
}

function mapProduct(product) {
  return {
    id: product.slug,
    name: product.name,
    category: product.category,
    price: product.price_cents / 100,
    description: product.description,
    image: product.image_url,
    imageAlt: product.image_alt,
    meta: product.meta,
    tag: product.tag,
  };
}

function generateOrderNumber() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = 'MRW-';
  for (let i = 0; i < 8; i++) result += chars.charAt(Math.floor(Math.random() * chars.length));
  return result;
}

function generateReceiptNumber(orderNumber) {
  return `RCT-${orderNumber.slice(4)}`;
}

// Fetch a single order plus its line items and shape it for the client.
function readOrder(whereClause) {
  const order = runSql(`SELECT id, public_order_number, user_id, status, total_cents, shipping_json, receipt_number, payment_method, card_last4, created_at FROM orders WHERE ${whereClause} LIMIT 1;`)[0];
  if (!order) return null;
  let shipping = {};
  try { shipping = JSON.parse(order.shipping_json); } catch { shipping = {}; }
  const items = runSql(`SELECT product_name, unit_price_cents, quantity FROM order_items WHERE order_id = ${Number(order.id)} ORDER BY id;`)
    .map((item) => ({ name: item.product_name, price: item.unit_price_cents / 100, quantity: item.quantity }));
  return {
    orderNumber: order.public_order_number,
    date: order.created_at,
    status: order.status,
    shipping,
    receipt: { receiptNumber: order.receipt_number, paymentMethod: order.payment_method, cardLast4: order.card_last4 },
    items,
    total: order.total_cents / 100,
  };
}

function requireUser(response, request, role) {
  const user = getSessionUser(request);
  if (!user) {
    sendJson(response, 401, { error: 'Please sign in to continue.' });
    return null;
  }
  if (role && user.role !== role) {
    sendJson(response, 403, { error: 'You do not have access to this resource.' });
    return null;
  }
  return user;
}

async function handleApi(request, response, requestUrl) {
  if (requestUrl.pathname === '/api/health' && request.method === 'GET') {
    sendJson(response, 200, { ok: true, service: 'morrow-api', database: { engine: 'SQLite', active: true, file: 'database/morrow.sqlite' } });
    return true;
  }

  if (requestUrl.pathname === '/api/products' && request.method === 'GET') {
    const products = runSql('SELECT slug, name, description, category, price_cents, image_url, image_alt, meta, tag FROM products WHERE published = 1 ORDER BY sort_order, id;').map(mapProduct);
    sendJson(response, 200, { products });
    return true;
  }

  const productMatch = requestUrl.pathname.match(/^\/api\/products\/([^/]+)$/);
  if (productMatch && request.method === 'GET') {
    const product = runSql(`SELECT slug, name, description, category, price_cents, image_url, image_alt, meta, tag FROM products WHERE slug = ${sqlValue(decodeURIComponent(productMatch[1]))} AND published = 1 LIMIT 1;`)[0];
    if (!product) {
      sendJson(response, 404, { error: 'Product not found' });
      return true;
    }
    sendJson(response, 200, { product: mapProduct(product) });
    return true;
  }

  if (requestUrl.pathname === '/api/auth/register' && request.method === 'POST') {
    const body = await readBody(request);
    const email = String(body.email || '').trim().toLowerCase();
    const name = String(body.name || '').trim();
    const password = String(body.password || '');
    if (!email || !name || password.length < 8) { sendJson(response, 400, { error: 'Name, email, and a password of at least 8 characters are required.' }); return true; }
    if (runSql(`SELECT id FROM users WHERE email = ${sqlValue(email)} LIMIT 1;`).length) { sendJson(response, 409, { error: 'An account already exists for that email.' }); return true; }
    runSql(`INSERT INTO users (email, name, password_hash) VALUES (${sqlValue(email)}, ${sqlValue(name)}, ${sqlValue(hashPassword(password))});`);
    const user = runSql(`SELECT id, email, name, role, status FROM users WHERE email = ${sqlValue(email)} LIMIT 1;`)[0];
    const token = createSession(user.id, user.email);
    sendJson(response, 201, { user: { ...user, signed_in_at: new Date().toISOString() } }, { 'Set-Cookie': `morrow_session=${token}; HttpOnly; SameSite=Lax; Path=/; Max-Age=604800` });
    return true;
  }

  if (requestUrl.pathname === '/api/auth/login' && request.method === 'POST') {
    const body = await readBody(request);
    const email = String(body.email || '').trim().toLowerCase();
    const password = String(body.password || '');
    const user = runSql(`SELECT * FROM users WHERE email = ${sqlValue(email)} LIMIT 1;`)[0];
    if (!user || user.status !== 'active' || !passwordsMatch(password, user.password_hash)) {
      if (user) runSql(`INSERT INTO login_activity (user_id, email, event_type, success) VALUES (${Number(user.id)}, ${sqlValue(email)}, 'login_failure', 0);`);
      sendJson(response, 401, { error: 'The email or password is incorrect.' });
      return true;
    }
    const token = createSession(user.id, user.email);
    sendJson(response, 200, { user: { id: user.id, email: user.email, name: user.name, role: user.role, status: user.status, signed_in_at: new Date().toISOString() } }, { 'Set-Cookie': `morrow_session=${token}; HttpOnly; SameSite=Lax; Path=/; Max-Age=604800` });
    return true;
  }

  if (requestUrl.pathname === '/api/auth/me' && request.method === 'GET') {
    const user = getSessionUser(request);
    sendJson(response, user ? 200 : 401, user ? { user } : { error: 'Not authenticated' });
    return true;
  }

  if (requestUrl.pathname === '/api/auth/logout' && request.method === 'POST') {
    const user = getSessionUser(request);
    const token = getCookies(request).morrow_session;
    if (token) {
      const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
      runSql(`UPDATE sessions SET revoked_at = datetime('now') WHERE token_hash = ${sqlValue(tokenHash)};${user ? ` INSERT INTO login_activity (user_id, email, event_type) VALUES (${Number(user.id)}, ${sqlValue(user.email)}, 'logout');` : ''}`);
    }
    sendJson(response, 200, { ok: true }, { 'Set-Cookie': 'morrow_session=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0' });
    return true;
  }

  if (requestUrl.pathname === '/api/orders' && request.method === 'POST') {
    const user = requireUser(response, request);
    if (!user) return true;

    const body = await readBody(request);
    const items = Array.isArray(body.items) ? body.items : [];
    const shipping = body.shipping || {};
    const receipt = body.receipt || {};

    if (!items.length) { sendJson(response, 400, { error: 'Your bag is empty.' }); return true; }
    if (!shipping.address || !shipping.city || !shipping.postalCode || !shipping.country) {
      sendJson(response, 400, { error: 'A complete shipping address is required.' });
      return true;
    }

    const normalizedItems = [];
    for (const item of items) {
      const name = String(item.name || '').trim();
      const product = runSql(`SELECT name, price_cents FROM products WHERE name = ${sqlValue(name)} AND published = 1 LIMIT 1;`)[0];
      if (!product) {
        sendJson(response, 400, { error: `The product "${name}" is no longer available.` });
        return true;
      }
      normalizedItems.push({
        name: product.name,
        price: Number(product.price_cents) / 100,
        quantity: Math.max(1, Math.floor(Number(item.quantity) || 1)),
      });
    }
    const totalCents = normalizedItems.reduce((sum, item) => sum + Math.round(item.price * 100) * item.quantity, 0);
    const orderNumber = generateOrderNumber();
    const receiptNumber = generateReceiptNumber(orderNumber);

    runSql(`INSERT INTO orders (public_order_number, user_id, status, total_cents, shipping_json, receipt_number, payment_method, card_last4)
      VALUES (${sqlValue(orderNumber)}, ${Number(user.id)}, 'placed', ${totalCents}, ${sqlValue(JSON.stringify(shipping))}, ${sqlValue(receiptNumber)}, ${sqlValue(receipt.paymentMethod || 'Card')}, ${sqlValue(receipt.cardLast4 || '')});`);
    const orderRow = runSql(`SELECT id FROM orders WHERE public_order_number = ${sqlValue(orderNumber)} LIMIT 1;`)[0];
    const orderId = Number(orderRow.id);

    for (const item of normalizedItems) {
      runSql(`INSERT INTO order_items (order_id, product_name, unit_price_cents, quantity) VALUES (${orderId}, ${sqlValue(item.name)}, ${Math.round(item.price * 100)}, ${item.quantity});`);
    }

    sendJson(response, 201, { order: readOrder(`id = ${orderId}`) });
    return true;
  }

  if (requestUrl.pathname === '/api/orders' && request.method === 'GET') {
    const user = requireUser(response, request);
    if (!user) return true;
    const rows = runSql(`SELECT id FROM orders WHERE user_id = ${Number(user.id)} ORDER BY created_at DESC, id DESC;`);
    const orders = rows.map((row) => readOrder(`id = ${Number(row.id)}`));
    sendJson(response, 200, { orders });
    return true;
  }

  if (requestUrl.pathname === '/api/admin/orders' && request.method === 'GET') {
    if (!requireUser(response, request, 'admin')) return true;
    const rows = runSql('SELECT id FROM orders ORDER BY created_at DESC, id DESC;');
    const orders = rows.map((row) => {
      const order = readOrder(`id = ${Number(row.id)}`);
      const buyer = runSql(`SELECT email, name FROM users WHERE id = (SELECT user_id FROM orders WHERE id = ${Number(row.id)});`)[0] || {};
      const buyerInfo = { name: buyer.name || 'Unknown', email: buyer.email || '' };
      return Object.assign({}, order, { buyer: buyerInfo });
    });
    sendJson(response, 200, { orders });
    return true;
  }

  return false;
}

initializeDatabase();

const server = http.createServer(async (request, response) => {
  const requestUrl = new URL(request.url, `http://${host}:${port}`);
  if (request.method === 'OPTIONS' && requestUrl.pathname.startsWith('/api/')) {
    response.writeHead(204, {
      'Access-Control-Allow-Origin': 'http://127.0.0.1:3000',
      'Access-Control-Allow-Credentials': 'true',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    });
    response.end();
    return;
  }
  try {
    if (requestUrl.pathname.startsWith('/api/')) {
      if (await handleApi(request, response, requestUrl)) return;
      sendJson(response, 404, { error: 'API route not found' });
      return;
    }
    const requestedPath = requestUrl.pathname === '/' ? '/index.html' : requestUrl.pathname;
    const filePath = path.resolve(rootDirectory, `.${decodeURIComponent(requestedPath)}`);
    if (filePath !== rootDirectory && !filePath.startsWith(`${rootDirectory}${path.sep}`)) { sendJson(response, 404, { error: 'Not found' }); return; }
    fs.stat(filePath, (error, stats) => {
      if (error || !stats.isFile()) { sendJson(response, 404, { error: 'Not found' }); return; }
      fs.createReadStream(filePath).pipe(response);
    });
  } catch (error) {
    sendJson(response, error.message === 'Invalid JSON' ? 400 : 500, { error: error.message });
  }
});

server.listen(port, host, () => {
  console.log(`Morrow API running at http://${host}:${port}`);
});
