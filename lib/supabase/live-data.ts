import crypto from 'crypto';
import { createAdminSupabaseClient } from './admin';

export const SESSION_COOKIE_NAME = 'morrow_session';

function normalizeUserRow(row: any) {
  if (!row) return null;

  return {
    id: String(row.id),
    email: row.email,
    name: row.name,
    role: row.role,
    status: row.status,
    passwordHash: row.password_hash ?? '',
  };
}

function normalizeOrderRow(row: any, items: any[] = []) {
  if (!row) return null;

  let shipping = {};
  try {
    shipping = typeof row.shipping_json === 'string' ? JSON.parse(row.shipping_json) : row.shipping_json ?? {};
  } catch {
    shipping = {};
  }

  return {
    id: String(row.id),
    orderNumber: row.public_order_number,
    userId: String(row.user_id),
    status: row.status,
    total: Number(row.total_cents ?? 0) / 100,
    shipping,
    receipt: {
      receiptNumber: row.receipt_number,
      paymentMethod: row.payment_method,
      cardLast4: row.card_last4 ?? '',
    },
    items: (items || []).map((item) => ({
      name: item.product_name,
      price: Number(item.unit_price_cents ?? 0) / 100,
      quantity: Number(item.quantity ?? 1),
    })),
    date: row.created_at,
  };
}

export function resolveSessionToken(request: Request) {
  const cookieHeader = request.headers.get('cookie') ?? '';
  const match = cookieHeader.match(new RegExp(`(?:^|; )${SESSION_COOKIE_NAME}=([^;]+)`));
  return match ? decodeURIComponent(match[1]) : undefined;
}

export function hashSessionToken(token: string) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export async function getUserByEmail(email: string) {
  const client = createAdminSupabaseClient();
  const normalizedEmail = String(email || '').trim().toLowerCase();
  if (!normalizedEmail) return null;

  const { data, error } = await client.from('users').select('*').eq('email', normalizedEmail).maybeSingle();
  if (error || !data) return null;

  return normalizeUserRow(data);
}

export async function getUserById(userId: string | number) {
  const client = createAdminSupabaseClient();
  const { data, error } = await client.from('users').select('*').eq('id', Number(userId)).maybeSingle();
  if (error || !data) return null;

  return normalizeUserRow(data);
}

export async function getUserByToken(token: string | undefined) {
  if (!token) return null;

  const client = createAdminSupabaseClient();
  const tokenHash = hashSessionToken(token);
  const { data: sessionRow, error: sessionError } = await client
    .from('sessions')
    .select('user_id, expires_at, revoked_at')
    .eq('token_hash', tokenHash)
    .is('revoked_at', null)
    .gt('expires_at', new Date().toISOString())
    .maybeSingle();

  if (sessionError || !sessionRow) return null;

  return getUserById(sessionRow.user_id);
}

export async function createSessionForUser(userId: string | number, email: string) {
  const client = createAdminSupabaseClient();
  const token = `session_${crypto.randomBytes(24).toString('hex')}`;
  const tokenHash = hashSessionToken(token);
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

  const { error: sessionError } = await client.from('sessions').insert([
    {
      user_id: Number(userId),
      token_hash: tokenHash,
      expires_at: expiresAt,
    },
  ]);

  if (sessionError) {
    throw new Error(sessionError.message || 'Unable to create the user session.');
  }

  await client.from('login_activity').insert([
    {
      user_id: Number(userId),
      email,
      event_type: 'login_success',
      success: true,
    },
  ]);

  return token;
}

export async function invalidateSessionToken(token: string | undefined) {
  if (!token) return;

  const client = createAdminSupabaseClient();
  const tokenHash = hashSessionToken(token);
  await client.from('sessions').update({ revoked_at: new Date().toISOString() }).eq('token_hash', tokenHash);
}

export async function getProducts() {
  const client = createAdminSupabaseClient();
  const { data, error } = await client
    .from('products')
    .select('*')
    .eq('published', true)
    .order('sort_order', { ascending: true })
    .order('id', { ascending: true });

  if (error) throw new Error(error.message || 'Unable to load products.');

  return (data || []).map((product) => ({
    id: product.slug,
    name: product.name,
    category: product.category,
    price: Number(product.price_cents ?? 0) / 100,
    description: product.description,
    image: product.image_url,
    imageAlt: product.image_alt,
    meta: product.meta,
    tag: product.tag,
  }));
}

export async function getProductBySlug(slug: string) {
  const client = createAdminSupabaseClient();
  const { data, error } = await client
    .from('products')
    .select('*')
    .eq('slug', slug)
    .eq('published', true)
    .maybeSingle();

  if (error || !data) return null;

  return {
    id: data.slug,
    name: data.name,
    category: data.category,
    price: Number(data.price_cents ?? 0) / 100,
    description: data.description,
    image: data.image_url,
    imageAlt: data.image_alt,
    meta: data.meta,
    tag: data.tag,
  };
}

export async function getOrdersForUser(userId: string | number) {
  const client = createAdminSupabaseClient();
  const { data: orders, error } = await client
    .from('orders')
    .select('*')
    .eq('user_id', Number(userId))
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message || 'Unable to load orders.');

  const normalized = [] as any[];
  for (const order of orders || []) {
    const { data: items, error: itemsError } = await client
      .from('order_items')
      .select('*')
      .eq('order_id', order.id)
      .order('id', { ascending: true });

    if (itemsError) throw new Error(itemsError.message || 'Unable to load order items.');
    normalized.push(normalizeOrderRow(order, items || []));
  }

  return normalized.filter(Boolean);
}

export async function getAllOrders() {
  const client = createAdminSupabaseClient();
  const { data: orders, error } = await client.from('orders').select('*').order('created_at', { ascending: false });

  if (error) throw new Error(error.message || 'Unable to load orders.');

  const normalized = [] as any[];
  for (const order of orders || []) {
    const { data: items, error: itemsError } = await client
      .from('order_items')
      .select('*')
      .eq('order_id', order.id)
      .order('id', { ascending: true });

    if (itemsError) throw new Error(itemsError.message || 'Unable to load order items.');
    normalized.push(normalizeOrderRow(order, items || []));
  }

  return normalized.filter(Boolean);
}

export async function createOrderForUser(userId: string | number, payload: any) {
  const client = createAdminSupabaseClient();
  const items = Array.isArray(payload?.items) ? payload.items : [];

  if (!items.length) {
    throw new Error('Your bag is empty.');
  }

  const shipping = payload?.shipping || {};
  if (!shipping.address || !shipping.city || !shipping.postalCode || !shipping.country) {
    throw new Error('A complete shipping address is required.');
  }

  const normalizedItems = [] as any[];
  let totalCents = 0;

  for (const item of items) {
    const name = String(item?.name || '').trim();
    const quantity = Math.max(1, Math.floor(Number(item?.quantity) || 1));

    if (!name) {
      throw new Error('A product name is required.');
    }

    let productResult = await client.from('products').select('*').eq('slug', name).eq('published', true).maybeSingle();
    let product = productResult.data;

    if (!product) {
      productResult = await client.from('products').select('*').eq('name', name).eq('published', true).maybeSingle();
      product = productResult.data;
    }

    if (productResult.error || !product) {
      throw new Error(`The product "${name}" is no longer available.`);
    }

    const unitPriceCents = Number(product.price_cents ?? 0);
    normalizedItems.push({
      name: product.name,
      price: unitPriceCents / 100,
      quantity,
    });
    totalCents += unitPriceCents * quantity;
  }

  const orderNumber = `MRW-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
  const receiptNumber = `RCT-${orderNumber.slice(4)}`;
  const shippingJson = JSON.stringify({
    address: String(shipping.address || '').trim(),
    city: String(shipping.city || '').trim(),
    postalCode: String(shipping.postalCode || '').trim(),
    country: String(shipping.country || '').trim(),
  });

  const { data: orderRow, error: orderError } = await client
    .from('orders')
    .insert([
      {
        public_order_number: orderNumber,
        user_id: Number(userId),
        status: 'placed',
        total_cents: totalCents,
        shipping_json: shippingJson,
        receipt_number: receiptNumber,
        payment_method: String(payload?.receipt?.paymentMethod || 'Card'),
        card_last4: String(payload?.receipt?.cardLast4 || ''),
      },
    ])
    .select('*')
    .single();

  if (orderError || !orderRow) {
    throw new Error(orderError?.message || 'Unable to place the order.');
  }

  const itemRows = normalizedItems.map((item) => ({
    order_id: orderRow.id,
    product_name: item.name,
    unit_price_cents: Math.round(item.price * 100),
    quantity: item.quantity,
  }));

  const { error: itemError } = await client.from('order_items').insert(itemRows);
  if (itemError) {
    throw new Error(itemError.message || 'Unable to save the order items.');
  }

  const newOrder = await getOrderById(orderRow.id);
  if (!newOrder) {
    throw new Error('The order was created but could not be loaded.');
  }

  return newOrder;
}

export async function getOrderById(orderId: string | number) {
  const client = createAdminSupabaseClient();
  const { data: order, error } = await client.from('orders').select('*').eq('id', Number(orderId)).maybeSingle();
  if (error || !order) return null;

  const { data: items } = await client.from('order_items').select('*').eq('order_id', order.id).order('id', { ascending: true });
  return normalizeOrderRow(order, items || []);
}

export async function createUserAccount(email: string, name: string, password: string) {
  const client = createAdminSupabaseClient();
  const normalizedEmail = String(email || '').trim().toLowerCase();
  const normalizedName = String(name || '').trim();
  const passwordHash = `legacy:${Buffer.from(password).toString('base64')}`;

  const { data, error } = await client
    .from('users')
    .insert([
      {
        email: normalizedEmail,
        name: normalizedName,
        password_hash: passwordHash,
        role: 'customer',
        status: 'active',
      },
    ])
    .select('*')
    .single();

  if (error || !data) {
    throw new Error(error?.message || 'Unable to create the account.');
  }

  return normalizeUserRow(data);
}

export async function validatePassword(rawPassword: string, storedHash: string) {
  return `legacy:${Buffer.from(rawPassword).toString('base64')}` === storedHash;
}
