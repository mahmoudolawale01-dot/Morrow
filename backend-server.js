require('dotenv').config();

const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const childProcess = require('child_process');
const { Client } = require('pg');
const { resolveSupabaseConfig, createSupabaseClients } = require('./supabase');

const rootDirectory = path.resolve(__dirname);
const schemaPath = path.join(rootDirectory, 'database', 'schema.sql');
const databasePath = process.env.DATABASE_PATH || path.join(rootDirectory, 'database', 'morrow.sqlite');
const sqlitePath = process.env.SQLITE_PATH || path.join(process.env.LOCALAPPDATA, 'Microsoft', 'WinGet', 'Packages', 'SQLite.SQLite_Microsoft.Winget.Source_8wekyb3d8bbwe', 'sqlite3.exe');
const supabaseConfig = resolveSupabaseConfig(process.env);
const { admin: supabaseAdmin } = createSupabaseClients(process.env);
const databaseUrl = process.env.DATABASE_URL || supabaseConfig.databaseUrl || null;
const isPostgresMode = Boolean(databaseUrl);
const isSupabaseMode = Boolean(supabaseConfig.enabled && supabaseAdmin);
const isProduction = process.env.NODE_ENV === 'production';
const adminEmail = (process.env.ADMIN_EMAIL || 'admin@morrow.local').trim().toLowerCase();
const adminPassword = process.env.ADMIN_PASSWORD || 'morrow-admin';
const adminName = process.env.ADMIN_NAME || 'Morrow Admin';
const port = Number(process.env.API_PORT || process.env.PORT) || 3001;
const host = process.env.API_HOST || process.env.HOST || (isProduction ? '0.0.0.0' : '127.0.0.1');
const allowedOrigins = (process.env.ALLOWED_ORIGINS || 'http://127.0.0.1:3000,http://localhost:3000').split(',').map((origin) => origin.trim()).filter(Boolean);
let postgresClient = null;

function normalizeRole(role) {
  const normalized = String(role || 'customer').trim().toLowerCase();
  if (normalized === 'vendor') return 'seller';
  return ['customer', 'admin', 'seller'].includes(normalized) ? normalized : 'customer';
}

function resolveAllowedOrigin(origin) {
  if (origin && allowedOrigins.includes(origin)) return origin;
  return allowedOrigins[0] || 'http://127.0.0.1:3000';
}

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
  const requestOrigin = response.req?.headers.origin;
  response.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': resolveAllowedOrigin(requestOrigin),
    'Access-Control-Allow-Credentials': 'true',
    ...headers,
  });
  response.end(JSON.stringify(payload));
}

function getSessionCookieHeader(token) {
  const secureSuffix = isProduction ? '; Secure; SameSite=None' : '; SameSite=Lax';
  return `morrow_session=${token}; HttpOnly${secureSuffix}; Path=/; Max-Age=604800`;
}

function clearSessionCookieHeader() {
  const secureSuffix = isProduction ? '; Secure; SameSite=None' : '; SameSite=Lax';
  return `morrow_session=; HttpOnly${secureSuffix}; Path=/; Max-Age=0`;
}

function sqlValue(value) {
  return `'${String(value ?? '').replace(/'/g, "''")}'`;
}

function normalizeSqlForDatabase(sql) {
  if (!isPostgresMode) return sql;
  let normalized = String(sql)
    .replace(/INSERT OR IGNORE INTO/gi, 'INSERT INTO')
    .replace(/datetime\('now'\)/gi, 'NOW()')
    .replace(/datetime\('now', '\+7 days'\)/gi, "NOW() + INTERVAL '7 days'")
    .replace(/datetime\('now', '\+1 day'\)/gi, "NOW() + INTERVAL '1 day'")
    .replace(/AUTOINCREMENT/gi, 'GENERATED BY DEFAULT AS IDENTITY');

  if (normalized.includes('PRAGMA table_info(products);')) {
    normalized = "SELECT column_name FROM information_schema.columns WHERE table_name = 'products';";
  }

  return normalized;
}

function normalizeSchemaSql(schemaSql) {
  return String(schemaSql)
    .replace(/INTEGER PRIMARY KEY AUTOINCREMENT/gi, 'INTEGER GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY')
    .replace(/AUTOINCREMENT/gi, 'GENERATED BY DEFAULT AS IDENTITY');
}

async function connectPostgres() {
  if (!isPostgresMode) return null;
  if (!postgresClient) {
    postgresClient = new Client({
      connectionString: databaseUrl,
      ssl: process.env.PGSSLMODE === 'require' ? { rejectUnauthorized: false } : undefined,
    });
    await postgresClient.connect();
  }
  return postgresClient;
}

async function runSql(sql) {
  if (isPostgresMode) {
    const client = await connectPostgres();
    const normalizedSql = normalizeSqlForDatabase(sql);
    const statements = normalizedSql.split(';').map((statement) => statement.trim()).filter(Boolean);
    const rows = [];

    for (const statement of statements) {
      const result = await client.query(statement);
      if (Array.isArray(result.rows)) rows.push(...result.rows);
    }

    return rows;
  }

  const output = childProcess.execFileSync(sqlitePath, [databasePath, '-json', sql], { encoding: 'utf8' }).trim();
  return output ? JSON.parse(output) : [];
}

async function initializeDatabase() {
  if (isPostgresMode) {
    const client = await connectPostgres();
    const requiredTables = ['users', 'sessions', 'password_reset_tokens', 'login_activity', 'products', 'orders', 'order_items', 'seller_submissions'];
    const result = await client.query(
      "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name = ANY($1::text[]);",
      [requiredTables],
    );
    const existingTables = new Set(result.rows.map((row) => row.table_name));
    const missingTables = requiredTables.filter((tableName) => !existingTables.has(tableName));
    if (missingTables.length) {
      throw new Error(`PostgreSQL schema is missing tables: ${missingTables.join(', ')}. Apply the Supabase migration before starting the API.`);
    }
    await runSql("ALTER TABLE users ADD COLUMN IF NOT EXISTS phone TEXT NOT NULL DEFAULT ''; ALTER TABLE users ADD COLUMN IF NOT EXISTS address TEXT NOT NULL DEFAULT ''; ALTER TABLE products ADD COLUMN IF NOT EXISTS vendor TEXT NOT NULL DEFAULT 'Morrow'; UPDATE products SET vendor = 'Morrow' WHERE vendor IS NULL OR vendor = '';");
  } else {
    const schema = fs.readFileSync(schemaPath, 'utf8');
    childProcess.execFileSync(sqlitePath, [databasePath], { input: schema, encoding: 'utf8' });
    const userColumns = (await runSql('PRAGMA table_info(users);')).map((column) => column.name);
    if (!userColumns.includes('phone')) await runSql("ALTER TABLE users ADD COLUMN phone TEXT NOT NULL DEFAULT '';");
    if (!userColumns.includes('address')) await runSql("ALTER TABLE users ADD COLUMN address TEXT NOT NULL DEFAULT '';");
    const productColumns = (await runSql('PRAGMA table_info(products);')).map((column) => column.name);
    if (!productColumns.includes('slug')) {
      childProcess.execFileSync(sqlitePath, [databasePath], { input: 'ALTER TABLE products RENAME TO products_legacy;', encoding: 'utf8' });
      childProcess.execFileSync(sqlitePath, [databasePath], { input: schema, encoding: 'utf8' });
    }
    if (!productColumns.includes('vendor')) {
      await runSql("ALTER TABLE products ADD COLUMN vendor TEXT NOT NULL DEFAULT 'Morrow';");
      await runSql("UPDATE products SET vendor = 'Morrow' WHERE vendor IS NULL OR vendor = '';");
    }
    for (const product of seedProducts) {
      await runSql(`INSERT OR IGNORE INTO products (slug, name, description, category, price_cents, image_url, image_alt, meta, tag, sort_order) VALUES (${product.map(sqlValue).join(', ')});`);
    }
  }

  await ensureAdminBootstrap();
}

async function ensureAdminBootstrap() {
  const adminHash = hashPassword(adminPassword);
  const existing = (await runSql(`SELECT id, role FROM users WHERE email = ${sqlValue(adminEmail)} LIMIT 1;`))[0];

  if (!existing) {
    await runSql(`INSERT INTO users (email, name, password_hash, role, status) VALUES (${sqlValue(adminEmail)}, ${sqlValue(adminName)}, ${sqlValue(adminHash)}, 'admin', 'active');`);
    return;
  }

  await runSql(`UPDATE users SET name = ${sqlValue(adminName)}, password_hash = ${sqlValue(adminHash)}, role = 'admin', status = 'active' WHERE id = ${Number(existing.id)};`);
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

async function createSession(userId, email) {
  const token = crypto.randomBytes(32).toString('hex');
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  await runSql(`INSERT INTO sessions (user_id, token_hash, expires_at) VALUES (${Number(userId)}, ${sqlValue(tokenHash)}, datetime('now', '+7 days')); INSERT INTO login_activity (user_id, email, event_type) VALUES (${Number(userId)}, ${sqlValue(email)}, 'login_success');`);
  return token;
}

async function getSessionUser(request) {
  const token = getCookies(request).morrow_session;
  if (!token) return null;
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  const rows = await runSql(`SELECT users.id, users.email, users.name, users.role, users.status, sessions.created_at AS signed_in_at FROM sessions JOIN users ON users.id = sessions.user_id WHERE sessions.token_hash = ${sqlValue(tokenHash)} AND sessions.revoked_at IS NULL AND sessions.expires_at > datetime('now') AND users.status = 'active' LIMIT 1;`);
  return rows[0] || null;
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
    vendor: product.vendor || 'Morrow',
  };
}

function mapAdminProduct(product) {
  return {
    ...mapProduct(product),
    vendor: product.vendor || 'Morrow',
    published: Boolean(product.published),
    sortOrder: Number(product.sort_order),
    createdAt: product.created_at,
  };
}

function slugifyProductName(name) {
  return String(name)
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '') || 'product';
}

function parseProductInput(body) {
  const name = String(body.name || '').trim();
  const category = String(body.category || '').trim().toLowerCase();
  const description = String(body.description || '').trim();
  const image = String(body.image || '').trim();
  const meta = String(body.meta || '').trim();
  const vendor = String(body.vendor || '').trim();
  const price = Number(body.price);
  let imageUrl;

  try {
    imageUrl = new URL(image);
  } catch {
    imageUrl = null;
  }

  if (!name || !category || !description || !meta || !imageUrl || !['http:', 'https:'].includes(imageUrl.protocol) || !Number.isFinite(price) || price < 0) {
    return { error: 'Name, category, non-negative price, description, material, and a valid image URL are required.' };
  }

  return {
    product: {
      name,
      category,
      description,
      image,
      imageAlt: String(body.imageAlt || name).trim(),
      meta,
      tag: String(body.tag || '').trim(),
      vendor: vendor || 'Morrow',
      priceCents: Math.round(price * 100),
      published: body.published === undefined ? true : Boolean(body.published),
    },
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
async function readOrder(whereClause) {
  const order = (await runSql(`SELECT id, public_order_number, user_id, status, total_cents, shipping_json, receipt_number, payment_method, card_last4, created_at FROM orders WHERE ${whereClause} LIMIT 1;`))[0];
  if (!order) return null;
  let shipping = {};
  try { shipping = JSON.parse(order.shipping_json); } catch { shipping = {}; }
  const items = (await runSql(`SELECT product_name, unit_price_cents, quantity FROM order_items WHERE order_id = ${Number(order.id)} ORDER BY id;`))
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

async function requireUser(response, request, role) {
  const user = await getSessionUser(request);
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

function serializeUserRow(userRow) {
  if (!userRow) return null;
  return {
    id: Number(userRow.id),
    email: userRow.email,
    name: userRow.name,
    role: userRow.role,
    status: userRow.status,
    createdAt: userRow.created_at,
  };
}

async function checkDatabaseConnection() {
  try {
    if (isPostgresMode) {
      const client = await connectPostgres();
      await client.query('SELECT 1 AS ok;');
      return { ok: true, engine: 'PostgreSQL' };
    }

    if (isSupabaseMode) {
      const { data, error } = await supabaseAdmin.from('products').select('id').limit(1);
      if (error) throw error;
      return { ok: true, engine: 'Supabase' };
    }

    await runSql('SELECT 1;');
    return { ok: true, engine: 'SQLite' };
  } catch (error) {
    return { ok: false, engine: isPostgresMode ? 'PostgreSQL' : isSupabaseMode ? 'Supabase' : 'SQLite', error: error.message };
  }
}

async function handleApi(request, response, requestUrl) {
  if (requestUrl.pathname === '/api/health' && request.method === 'GET') {
    const dbStatus = await checkDatabaseConnection();
    const dbEngine = dbStatus.engine || (isPostgresMode ? 'PostgreSQL' : isSupabaseMode ? 'Supabase' : 'SQLite');
    sendJson(response, dbStatus.ok ? 200 : 503, {
      ok: dbStatus.ok,
      service: 'morrow-api',
      database: {
        engine: dbEngine,
        active: dbStatus.ok,
        provider: isSupabaseMode ? 'supabase' : isPostgresMode ? 'postgres' : 'sqlite',
        file: isPostgresMode || isSupabaseMode ? 'managed-database' : 'database/morrow.sqlite',
      },
      supabase: {
        enabled: isSupabaseMode,
        url: supabaseConfig.url || null,
      },
      error: dbStatus.ok ? undefined : dbStatus.error,
    });
    return true;
  }

  if (requestUrl.pathname === '/api/admin/products' && request.method === 'GET') {
    if (!await requireUser(response, request, 'admin')) return true;
    const rows = await runSql('SELECT slug, name, description, category, price_cents, image_url, image_alt, meta, tag, vendor, published, sort_order, created_at FROM products ORDER BY sort_order, id;');
    sendJson(response, 200, { products: rows.map(mapAdminProduct) });
    return true;
  }

  if (requestUrl.pathname === '/api/admin/products' && request.method === 'POST') {
    if (!await requireUser(response, request, 'admin')) return true;
    const { product, error } = parseProductInput(await readBody(request));
    if (error) {
      sendJson(response, 400, { error });
      return true;
    }

    const baseSlug = slugifyProductName(product.name);
    let slug = baseSlug;
    let suffix = 2;
    while ((await runSql(`SELECT id FROM products WHERE slug = ${sqlValue(slug)} LIMIT 1;`)).length) {
      slug = `${baseSlug}-${suffix}`;
      suffix += 1;
    }
    const maxOrder = (await runSql('SELECT MAX(sort_order) AS max_sort_order FROM products;'))[0]?.max_sort_order;
    const sortOrder = Number(maxOrder || 0) + 1;
    const publishedValue = isPostgresMode ? (product.published ? 'TRUE' : 'FALSE') : (product.published ? '1' : '0');
    await runSql(`INSERT INTO products (slug, name, description, category, price_cents, image_url, image_alt, meta, tag, vendor, published, sort_order)
      VALUES (${sqlValue(slug)}, ${sqlValue(product.name)}, ${sqlValue(product.description)}, ${sqlValue(product.category)}, ${product.priceCents}, ${sqlValue(product.image)}, ${sqlValue(product.imageAlt)}, ${sqlValue(product.meta)}, ${sqlValue(product.tag)}, ${sqlValue(product.vendor || 'Morrow')}, ${publishedValue}, ${sortOrder});`);
    const row = (await runSql(`SELECT slug, name, description, category, price_cents, image_url, image_alt, meta, tag, vendor, published, sort_order, created_at FROM products WHERE slug = ${sqlValue(slug)} LIMIT 1;`))[0];
    sendJson(response, 201, { product: mapAdminProduct(row) });
    return true;
  }

  if (requestUrl.pathname === '/api/admin/products/order' && request.method === 'PATCH') {
    if (!await requireUser(response, request, 'admin')) return true;
    const body = await readBody(request);
    const slugs = Array.isArray(body.products) ? body.products.map((slug) => String(slug)) : [];
    if (slugs.length > 2000 || new Set(slugs).size !== slugs.length) {
      sendJson(response, 400, { error: 'Provide a unique, valid product order.' });
      return true;
    }
    for (const slug of slugs) {
      if (!(await runSql(`SELECT id FROM products WHERE slug = ${sqlValue(slug)} LIMIT 1;`)).length) {
        sendJson(response, 404, { error: `Product not found: ${slug}` });
        return true;
      }
    }
    for (const [sortOrder, slug] of slugs.entries()) {
      await runSql(`UPDATE products SET sort_order = ${sortOrder}, updated_at = datetime('now') WHERE slug = ${sqlValue(slug)};`);
    }
    sendJson(response, 200, { ok: true });
    return true;
  }

  if (requestUrl.pathname === '/api/admin/products/reset' && request.method === 'POST') {
    if (!await requireUser(response, request, 'admin')) return true;
    const hiddenValue = isPostgresMode ? 'FALSE' : '0';
    await runSql(`UPDATE products SET published = ${hiddenValue};`);
    for (const [index, seed] of seedProducts.entries()) {
      const [slug, name, description, category, priceCents, image, imageAlt, meta, tag] = seed;
      const existing = (await runSql(`SELECT id FROM products WHERE slug = ${sqlValue(slug)} LIMIT 1;`))[0];
      if (existing) {
        await runSql(`UPDATE products SET name = ${sqlValue(name)}, description = ${sqlValue(description)}, category = ${sqlValue(category)}, price_cents = ${Number(priceCents)}, image_url = ${sqlValue(image)}, image_alt = ${sqlValue(imageAlt)}, meta = ${sqlValue(meta)}, tag = ${sqlValue(tag)}, vendor = 'Morrow', published = ${isPostgresMode ? 'TRUE' : '1'}, sort_order = ${Number(index + 1)}, updated_at = datetime('now') WHERE slug = ${sqlValue(slug)};`);
      } else {
        await runSql(`INSERT INTO products (slug, name, description, category, price_cents, image_url, image_alt, meta, tag, vendor, published, sort_order) VALUES (${sqlValue(slug)}, ${sqlValue(name)}, ${sqlValue(description)}, ${sqlValue(category)}, ${Number(priceCents)}, ${sqlValue(image)}, ${sqlValue(imageAlt)}, ${sqlValue(meta)}, ${sqlValue(tag)}, 'Morrow', ${isPostgresMode ? 'TRUE' : '1'}, ${Number(index + 1)});`);
      }
    }
    const rows = await runSql('SELECT slug, name, description, category, price_cents, image_url, image_alt, meta, tag, vendor, published, sort_order, created_at FROM products ORDER BY sort_order, id;');
    sendJson(response, 200, { products: rows.map(mapAdminProduct) });
    return true;
  }

  const adminProductMatch = requestUrl.pathname.match(/^\/api\/admin\/products\/([^/]+)$/);
  if (adminProductMatch && (request.method === 'PATCH' || request.method === 'DELETE')) {
    if (!await requireUser(response, request, 'admin')) return true;
    const slug = decodeURIComponent(adminProductMatch[1]);
    const existing = (await runSql(`SELECT id, tag, vendor, sort_order FROM products WHERE slug = ${sqlValue(slug)} LIMIT 1;`))[0];
    if (!existing) {
      sendJson(response, 404, { error: 'Product not found.' });
      return true;
    }

    if (request.method === 'DELETE') {
      await runSql(`DELETE FROM products WHERE slug = ${sqlValue(slug)};`);
      sendJson(response, 200, { deleted: true, id: slug });
      return true;
    }

    const { product, error } = parseProductInput(await readBody(request));
    if (error) {
      sendJson(response, 400, { error });
      return true;
    }
    const publishedValue = isPostgresMode ? (product.published ? 'TRUE' : 'FALSE') : (product.published ? '1' : '0');
    await runSql(`UPDATE products SET name = ${sqlValue(product.name)}, description = ${sqlValue(product.description)}, category = ${sqlValue(product.category)}, price_cents = ${product.priceCents}, image_url = ${sqlValue(product.image)}, image_alt = ${sqlValue(product.imageAlt)}, meta = ${sqlValue(product.meta)}, tag = ${sqlValue(product.tag || existing.tag)}, vendor = ${sqlValue(product.vendor || existing.vendor || 'Morrow')}, published = ${publishedValue}, updated_at = datetime('now') WHERE slug = ${sqlValue(slug)};`);
    const row = (await runSql(`SELECT slug, name, description, category, price_cents, image_url, image_alt, meta, tag, vendor, published, sort_order, created_at FROM products WHERE slug = ${sqlValue(slug)} LIMIT 1;`))[0];
    sendJson(response, 200, { product: mapAdminProduct(row) });
    return true;
  }

  if (requestUrl.pathname === '/api/products' && request.method === 'GET') {
    const products = (await runSql('SELECT slug, name, description, category, price_cents, image_url, image_alt, meta, tag, vendor FROM products WHERE published = 1 ORDER BY sort_order, id;')).map(mapProduct);
    sendJson(response, 200, { products });
    return true;
  }

  const productMatch = requestUrl.pathname.match(/^\/api\/products\/([^/]+)$/);
  if (productMatch && request.method === 'GET') {
    const product = (await runSql(`SELECT slug, name, description, category, price_cents, image_url, image_alt, meta, tag, vendor FROM products WHERE slug = ${sqlValue(decodeURIComponent(productMatch[1]))} AND published = 1 LIMIT 1;`))[0];
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
    const role = normalizeRole(body.role);
    const phone = String(body.phone || '').trim();
    const address = String(body.address || '').trim();
    if (!['customer', 'seller'].includes(role)) { sendJson(response, 400, { error: 'Registration role must be user or vendor.' }); return true; }
    if (!email || !name || password.length < 8) { sendJson(response, 400, { error: 'Name, email, and a password of at least 8 characters are required.' }); return true; }
    if (role === 'seller' && (!phone || !address)) { sendJson(response, 400, { error: 'Phone number and address are required for vendor signup.' }); return true; }
    if ((await runSql(`SELECT id FROM users WHERE email = ${sqlValue(email)} LIMIT 1;`)).length) { sendJson(response, 409, { error: 'An account already exists for that email.' }); return true; }
    await runSql(`INSERT INTO users (email, name, phone, address, password_hash, role) VALUES (${sqlValue(email)}, ${sqlValue(name)}, ${sqlValue(phone)}, ${sqlValue(address)}, ${sqlValue(hashPassword(password))}, ${sqlValue(role)});`);
    const user = (await runSql(`SELECT id, email, name, phone, address, role, status FROM users WHERE email = ${sqlValue(email)} LIMIT 1;`))[0];
    const token = await createSession(user.id, user.email);
    sendJson(response, 201, { user: { ...user, signed_in_at: new Date().toISOString() } }, { 'Set-Cookie': getSessionCookieHeader(token) });
    return true;
  }

  if (requestUrl.pathname === '/api/auth/login' && request.method === 'POST') {
    const body = await readBody(request);
    const email = String(body.email || '').trim().toLowerCase();
    const password = String(body.password || '');
    const user = (await runSql(`SELECT * FROM users WHERE email = ${sqlValue(email)} LIMIT 1;`))[0];
    if (!user || user.status !== 'active' || !passwordsMatch(password, user.password_hash)) {
      if (user) await runSql(`INSERT INTO login_activity (user_id, email, event_type, success) VALUES (${Number(user.id)}, ${sqlValue(email)}, 'login_failure', 0);`);
      sendJson(response, 401, { error: 'The email or password is incorrect.' });
      return true;
    }
    const token = await createSession(user.id, user.email);
    sendJson(response, 200, { user: { id: user.id, email: user.email, name: user.name, phone: user.phone, address: user.address, role: user.role, status: user.status, signed_in_at: new Date().toISOString() } }, { 'Set-Cookie': getSessionCookieHeader(token) });
    return true;
  }

  if (requestUrl.pathname === '/api/auth/me' && request.method === 'GET') {
    const user = await getSessionUser(request);
    sendJson(response, user ? 200 : 401, user ? { user } : { error: 'Not authenticated' });
    return true;
  }

  if (requestUrl.pathname === '/api/auth/logout' && request.method === 'POST') {
    const user = await getSessionUser(request);
    const token = getCookies(request).morrow_session;
    if (token) {
      const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
      await runSql(`UPDATE sessions SET revoked_at = datetime('now') WHERE token_hash = ${sqlValue(tokenHash)};${user ? ` INSERT INTO login_activity (user_id, email, event_type) VALUES (${Number(user.id)}, ${sqlValue(user.email)}, 'logout');` : ''}`);
    }
    sendJson(response, 200, { ok: true }, { 'Set-Cookie': clearSessionCookieHeader() });
    return true;
  }

  if (requestUrl.pathname === '/api/orders' && request.method === 'POST') {
    const user = await requireUser(response, request);
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
      const product = (await runSql(`SELECT name, price_cents FROM products WHERE name = ${sqlValue(name)} AND published = 1 LIMIT 1;`))[0];
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

    await runSql(`INSERT INTO orders (public_order_number, user_id, status, total_cents, shipping_json, receipt_number, payment_method, card_last4)
      VALUES (${sqlValue(orderNumber)}, ${Number(user.id)}, 'placed', ${totalCents}, ${sqlValue(JSON.stringify(shipping))}, ${sqlValue(receiptNumber)}, ${sqlValue(receipt.paymentMethod || 'Card')}, ${sqlValue(receipt.cardLast4 || '')});`);
    const orderRow = (await runSql(`SELECT id FROM orders WHERE public_order_number = ${sqlValue(orderNumber)} LIMIT 1;`))[0];
    const orderId = Number(orderRow.id);

    for (const item of normalizedItems) {
      await runSql(`INSERT INTO order_items (order_id, product_name, unit_price_cents, quantity) VALUES (${orderId}, ${sqlValue(item.name)}, ${Math.round(item.price * 100)}, ${item.quantity});`);
    }

    sendJson(response, 201, { order: await readOrder(`id = ${orderId}`) });
    return true;
  }

  if (requestUrl.pathname === '/api/orders' && request.method === 'GET') {
    const user = await requireUser(response, request);
    if (!user) return true;
    const rows = await runSql(`SELECT id FROM orders WHERE user_id = ${Number(user.id)} ORDER BY created_at DESC, id DESC;`);
    const orders = await Promise.all(rows.map((row) => readOrder(`id = ${Number(row.id)}`)));
    sendJson(response, 200, { orders });
    return true;
  }

  if (requestUrl.pathname === '/api/admin/users' && request.method === 'GET') {
    if (!await requireUser(response, request, 'admin')) return true;
    const rows = await runSql('SELECT id, email, name, role, status, created_at FROM users ORDER BY created_at DESC, id DESC;');
    sendJson(response, 200, { users: rows.map((row) => serializeUserRow(row)) });
    return true;
  }

  if (requestUrl.pathname === '/api/admin/export-data' && request.method === 'GET') {
    if (!await requireUser(response, request, 'admin')) return true;

    const type = requestUrl.searchParams.get('type');
    if (!['users', 'vendors', 'products'].includes(type)) {
      sendJson(response, 400, { error: 'Choose users, vendors, or products to export.' });
      return true;
    }

    const from = requestUrl.searchParams.get('from') || '';
    const to = requestUrl.searchParams.get('to') || '';
    const category = requestUrl.searchParams.get('category') || '';
    const vendorId = requestUrl.searchParams.get('vendorId') || '';
    const sort = requestUrl.searchParams.get('sort') || 'date';
    const validDate = (value) => !value || /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00.000Z`));
    if (!validDate(from) || !validDate(to) || from && to && from > to) {
      sendJson(response, 400, { error: 'Enter a valid date range.' });
      return true;
    }

    let records;
    if (type === 'users' || type === 'vendors') {
      const role = type === 'vendors' ? 'seller' : 'customer';
      const rows = await runSql(`SELECT id, email, name, phone, address, role, status, created_at FROM users WHERE role = ${sqlValue(role)} ORDER BY created_at DESC, id DESC;`);
      records = rows.map((row) => ({
        id: Number(row.id),
        name: row.name,
        email: row.email,
        phone: row.phone || '',
        address: row.address || '',
        role: row.role,
        status: row.status,
        createdAt: row.created_at,
      }));
      if (type === 'vendors' && vendorId) records = records.filter((record) => record.id === Number(vendorId));
    } else {
      const rows = await runSql('SELECT slug, name, description, category, price_cents, image_url, meta, published, created_at FROM products ORDER BY created_at DESC, id DESC;');
      records = rows.map((row) => ({
        id: row.slug,
        name: row.name,
        category: row.category,
        price: Number(row.price_cents) / 100,
        description: row.description,
        material: row.meta,
        image: row.image_url,
        published: Boolean(row.published),
        createdAt: row.created_at,
      }));
      if (category) records = records.filter((record) => record.category === category);
    }

    if (from || to) {
      const start = from ? Date.parse(`${from}T00:00:00.000Z`) : Number.NEGATIVE_INFINITY;
      const end = to ? Date.parse(`${to}T23:59:59.999Z`) : Number.POSITIVE_INFINITY;
      records = records.filter((record) => {
        const timestamp = new Date(record.createdAt).getTime();
        return Number.isFinite(timestamp) && timestamp >= start && timestamp <= end;
      });
    }

    const compareName = (left, right) => String(left.name || '').localeCompare(String(right.name || ''));
    if (sort === 'name' || sort === 'vendor') records.sort(compareName);
    else if (sort === 'category') records.sort((left, right) => String(left.category || '').localeCompare(String(right.category || '')) || compareName(left, right));
    else records.sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime());

    sendJson(response, 200, { type, records });
    return true;
  }

  const adminUserMatch = requestUrl.pathname.match(/^\/api\/admin\/users\/(\d+)$/);
  if (adminUserMatch && (request.method === 'PATCH' || request.method === 'DELETE')) {
    const currentAdmin = await requireUser(response, request, 'admin');
    if (!currentAdmin) return true;

    const targetId = Number(adminUserMatch[1]);
    const targetUser = (await runSql(`SELECT id, email, name, role, status, created_at FROM users WHERE id = ${targetId} LIMIT 1;`))[0];
    if (!targetUser) {
      sendJson(response, 404, { error: 'User not found.' });
      return true;
    }

    if (Number(currentAdmin.id) === targetId) {
      sendJson(response, 400, { error: 'You cannot update or delete your own admin account from this panel.' });
      return true;
    }

    if (request.method === 'PATCH') {
      const body = await readBody(request);
      const nextStatus = body.status ? String(body.status).trim().toLowerCase() : targetUser.status;
      const nextRole = body.role ? String(body.role).trim().toLowerCase() : targetUser.role;
      const nextName = body.name !== undefined ? String(body.name).trim() : targetUser.name;

      if (!['active', 'suspended', 'deleted'].includes(nextStatus)) {
        sendJson(response, 400, { error: 'Status must be active, suspended, or deleted.' });
        return true;
      }
      if (!['customer', 'admin', 'seller'].includes(nextRole)) {
        sendJson(response, 400, { error: 'Role must be customer, admin, or seller.' });
        return true;
      }
      if (!nextName) {
        sendJson(response, 400, { error: 'A user name is required.' });
        return true;
      }

      await runSql(`UPDATE users SET name = ${sqlValue(nextName)}, role = ${sqlValue(nextRole)}, status = ${sqlValue(nextStatus)} WHERE id = ${targetId};`);
      if (nextStatus === 'deleted') {
        await runSql(`UPDATE sessions SET revoked_at = datetime('now') WHERE user_id = ${targetId};`);
      }

      const updatedUser = (await runSql(`SELECT id, email, name, role, status, created_at FROM users WHERE id = ${targetId} LIMIT 1;`))[0];
      sendJson(response, 200, { user: serializeUserRow(updatedUser) });
      return true;
    }

    await runSql(`UPDATE users SET status = 'deleted' WHERE id = ${targetId}; UPDATE sessions SET revoked_at = datetime('now') WHERE user_id = ${targetId};`);
    const updatedUser = (await runSql(`SELECT id, email, name, role, status, created_at FROM users WHERE id = ${targetId} LIMIT 1;`))[0];
    sendJson(response, 200, { user: serializeUserRow(updatedUser), deleted: true });
    return true;
  }

  if (requestUrl.pathname === '/api/seller/submissions' && request.method === 'POST') {
    const user = await requireUser(response, request, 'seller');
    if (!user) return true;

    const body = await readBody(request);
    const payload = {
      seller: String(body.seller || user.name || 'Vendor'),
      email: String(body.email || user.email || '').trim(),
      name: String(body.name || '').trim(),
      category: String(body.category || 'ceramics').trim(),
      price: Number(body.price || 0),
      image: String(body.image || '').trim(),
      description: String(body.description || '').trim(),
      material: String(body.material || '').trim(),
      status: 'Pending review',
      submittedAt: new Date().toISOString(),
    };

    if (!payload.name || !payload.email || !payload.image || !payload.description || !payload.material) {
      sendJson(response, 400, { error: 'Seller name, product name, email, description, material, and image are required.' });
      return true;
    }

    await runSql(`INSERT INTO seller_submissions (user_id, seller_email, product_json, status) VALUES (${Number(user.id)}, ${sqlValue(payload.email)}, ${sqlValue(JSON.stringify(payload))}, 'pending');`);
    sendJson(response, 201, { submission: payload });
    return true;
  }

  if (requestUrl.pathname === '/api/seller/submissions' && request.method === 'GET') {
    const user = await requireUser(response, request, 'seller');
    if (!user) return true;

    const rows = await runSql(`SELECT id, seller_email, product_json, status, created_at FROM seller_submissions WHERE user_id = ${Number(user.id)} ORDER BY created_at DESC, id DESC;`);
    const submissions = rows.map((row) => {
      let product = {};
      try { product = JSON.parse(row.product_json || '{}'); } catch {}
      return {
        id: Number(row.id),
        seller: product.seller || row.seller_email,
        email: product.email || row.seller_email,
        name: product.name || 'Untitled item',
        category: product.category || 'uncategorized',
        price: Number(product.price || 0),
        image: product.image || '',
        description: product.description || '',
        material: product.material || '',
        status: row.status,
        reason: product.rejectionReason || '',
        productSlug: product.approvedSlug || '',
        submittedAt: row.created_at,
      };
    });

    sendJson(response, 200, { submissions });
    return true;
  }

  if (requestUrl.pathname === '/api/admin/submissions' && request.method === 'GET') {
    if (!await requireUser(response, request, 'admin')) return true;
    const rows = await runSql('SELECT id, seller_email, product_json, status, created_at FROM seller_submissions ORDER BY created_at DESC, id DESC;');
    const submissions = rows.map((row) => {
      let product = {};
      try { product = JSON.parse(row.product_json || '{}'); } catch {}
      return {
        id: Number(row.id),
        seller: product.seller || row.seller_email,
        email: product.email || row.seller_email,
        name: product.name || 'Untitled item',
        category: product.category || 'uncategorized',
        price: Number(product.price || 0),
        image: product.image || '',
        description: product.description || '',
        material: product.material || '',
        status: row.status,
        reason: product.rejectionReason || '',
        productSlug: product.approvedSlug || '',
        submittedAt: row.created_at,
      };
    });
    sendJson(response, 200, { submissions });
    return true;
  }

  const adminSubmissionActionMatch = requestUrl.pathname.match(/^\/api\/admin\/submissions\/(\d+)\/(approve|reject)$/);
  const adminSubmissionMatch = requestUrl.pathname.match(/^\/api\/admin\/submissions\/(\d+)$/);

  if ((adminSubmissionActionMatch && request.method === 'POST') || (adminSubmissionMatch && (request.method === 'POST' || request.method === 'PATCH'))) {
    if (!await requireUser(response, request, 'admin')) return true;

    const submissionId = Number(adminSubmissionActionMatch ? adminSubmissionActionMatch[1] : adminSubmissionMatch[1]);
    const submissionRow = (await runSql(`SELECT id, user_id, seller_email, product_json, status, created_at FROM seller_submissions WHERE id = ${submissionId} LIMIT 1;`))[0];

    if (!submissionRow) {
      sendJson(response, 404, { error: 'Submission not found.' });
      return true;
    }

    let action;
    let body = {};
    if (adminSubmissionActionMatch) {
      action = adminSubmissionActionMatch[2];
      try { body = await readBody(request); } catch {}
    } else {
      body = await readBody(request);
      action = String(body.action || body.status || '').trim().toLowerCase();
      if (action === 'approved') action = 'approve';
      if (action === 'rejected') action = 'reject';
    }

    if (action !== 'approve' && action !== 'reject') {
      sendJson(response, 400, { error: 'Invalid review action. Action must be approve or reject.' });
      return true;
    }

    let productData = {};
    try {
      productData = JSON.parse(submissionRow.product_json || '{}');
    } catch {
      productData = {};
    }

    if (action === 'approve') {
      if (submissionRow.status === 'approved') {
        sendJson(response, 400, { error: 'Submission has already been approved.' });
        return true;
      }

      const { product, error } = parseProductInput({
        name: body.name || productData.name,
        category: body.category || productData.category,
        price: body.price !== undefined ? body.price : productData.price,
        image: body.image || productData.image,
        description: body.description || productData.description,
        meta: body.meta || body.material || productData.material || productData.meta || 'Vendor piece',
        imageAlt: body.imageAlt || productData.imageAlt || productData.name,
        tag: body.tag || productData.tag || 'Vendor',
        vendor: body.vendor || productData.seller || submissionRow.seller_email || 'Vendor',
        published: body.published !== undefined ? body.published : true,
      });

      if (error) {
        sendJson(response, 400, { error: `Cannot approve submission: ${error}` });
        return true;
      }

      const baseSlug = slugifyProductName(product.name);
      let slug = baseSlug;
      let suffix = 2;
      while ((await runSql(`SELECT id FROM products WHERE slug = ${sqlValue(slug)} LIMIT 1;`)).length) {
        slug = `${baseSlug}-${suffix}`;
        suffix += 1;
      }

      const maxOrder = (await runSql('SELECT MAX(sort_order) AS max_sort_order FROM products;'))[0]?.max_sort_order;
      const sortOrder = Number(maxOrder || 0) + 1;
      const publishedValue = isPostgresMode ? (product.published ? 'TRUE' : 'FALSE') : (product.published ? '1' : '0');

      const sellerVendor = String(product.vendor || productData.seller || submissionRow.seller_email || 'Vendor').trim();

      await runSql(`INSERT INTO products (slug, name, description, category, price_cents, image_url, image_alt, meta, tag, vendor, published, sort_order)
        VALUES (${sqlValue(slug)}, ${sqlValue(product.name)}, ${sqlValue(product.description)}, ${sqlValue(product.category)}, ${product.priceCents}, ${sqlValue(product.image)}, ${sqlValue(product.imageAlt)}, ${sqlValue(product.meta)}, ${sqlValue(product.tag)}, ${sqlValue(sellerVendor)}, ${publishedValue}, ${sortOrder});`);

      const productRow = (await runSql(`SELECT slug, name, description, category, price_cents, image_url, image_alt, meta, tag, vendor, published, sort_order, created_at FROM products WHERE slug = ${sqlValue(slug)} LIMIT 1;`))[0];
      const createdProduct = mapAdminProduct(productRow);

      productData.status = 'approved';
      productData.approvedSlug = slug;
      productData.reviewedAt = new Date().toISOString();

      await runSql(`UPDATE seller_submissions SET status = 'approved', product_json = ${sqlValue(JSON.stringify(productData))}, updated_at = datetime('now') WHERE id = ${submissionId};`);

      sendJson(response, 200, {
        ok: true,
        submission: {
          id: submissionId,
          seller: productData.seller || submissionRow.seller_email,
          email: productData.email || submissionRow.seller_email,
          name: productData.name || 'Untitled item',
          category: productData.category || 'uncategorized',
          price: Number(productData.price || 0),
          image: productData.image || '',
          description: productData.description || '',
          material: productData.material || '',
          status: 'approved',
          productSlug: slug,
          submittedAt: submissionRow.created_at,
        },
        product: createdProduct,
      });
      return true;
    }

    if (action === 'reject') {
      if (submissionRow.status === 'approved') {
        sendJson(response, 400, { error: 'Cannot reject an already approved submission.' });
        return true;
      }

      const reason = String(body.reason || body.notes || '').trim();
      productData.status = 'rejected';
      productData.rejectionReason = reason;
      productData.reviewedAt = new Date().toISOString();

      await runSql(`UPDATE seller_submissions SET status = 'rejected', product_json = ${sqlValue(JSON.stringify(productData))}, updated_at = datetime('now') WHERE id = ${submissionId};`);

      sendJson(response, 200, {
        ok: true,
        submission: {
          id: submissionId,
          seller: productData.seller || submissionRow.seller_email,
          email: productData.email || submissionRow.seller_email,
          name: productData.name || 'Untitled item',
          category: productData.category || 'uncategorized',
          price: Number(productData.price || 0),
          image: productData.image || '',
          description: productData.description || '',
          material: productData.material || '',
          status: 'rejected',
          reason,
          submittedAt: submissionRow.created_at,
        },
      });
      return true;
    }
  }

  if (requestUrl.pathname === '/api/admin/orders' && request.method === 'GET') {
    if (!await requireUser(response, request, 'admin')) return true;
    const rows = await runSql('SELECT id FROM orders ORDER BY created_at DESC, id DESC;');
    const orders = await Promise.all(rows.map(async (row) => {
      const order = await readOrder(`id = ${Number(row.id)}`);
      const buyer = (await runSql(`SELECT email, name FROM users WHERE id = (SELECT user_id FROM orders WHERE id = ${Number(row.id)});`))[0] || {};
      const buyerInfo = { name: buyer.name || 'Unknown', email: buyer.email || '' };
      return Object.assign({}, order, { buyer: buyerInfo });
    }));
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
      'Access-Control-Allow-Origin': resolveAllowedOrigin(request.headers.origin),
      'Access-Control-Allow-Credentials': 'true',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',
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
