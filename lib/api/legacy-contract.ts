export type Product = {
  id: string;
  name: string;
  category: string;
  price: number;
  description: string;
  image: string;
  imageAlt: string;
  meta: string;
  tag: string;
};

export const defaultProducts: Product[] = [
  {
    id: 'arc-bud-vase',
    name: 'Arc bud vase',
    category: 'ceramics',
    price: 68,
    description: 'A softly sculptural bud vase, hand-thrown and finished with a quiet speckle glaze.',
    image: 'https://images.unsplash.com/photo-1610701596007-11502861dcfa?auto=format&fit=crop&w=800&q=85',
    imageAlt: 'Sculptural stoneware bud vase',
    meta: 'Sculptural stoneware',
    tag: 'New',
  },
  {
    id: 'daybreak-throw',
    name: 'Daybreak throw',
    category: 'textiles',
    price: 124,
    description: 'A generous washed linen throw with a weight that makes every corner feel warmer.',
    image: 'https://images.unsplash.com/photo-1528459105426-b9548367069b?auto=format&fit=crop&w=800&q=85',
    imageAlt: 'Natural linen throw blanket',
    meta: 'Washed European linen',
    tag: 'Bestseller',
  },
];

export type UserRecord = {
  id: string;
  email: string;
  name: string;
  role: 'customer' | 'admin' | 'seller';
  status: 'active' | 'suspended' | 'deleted';
  passwordHash: string;
};

export type SessionRecord = {
  userId: string;
  expiresAt: number;
};

export type OrderItem = {
  name: string;
  price: number;
  quantity: number;
};

export type OrderRecord = {
  id: string;
  orderNumber: string;
  userId: string;
  status: 'placed';
  total: number;
  shipping: Record<string, string>;
  receipt: {
    receiptNumber: string;
    paymentMethod: string;
    cardLast4: string;
  };
  items: OrderItem[];
  createdAt: string;
};

export const inMemoryUsers = new Map<string, UserRecord>();
export const inMemorySessions = new Map<string, SessionRecord>();
export const inMemoryOrders = new Map<string, OrderRecord>();

export function getProductBySlug(slug: string) {
  return defaultProducts.find((product) => product.id === slug) ?? null;
}

export function createSessionForUser(user: UserRecord) {
  const token = `session_${Math.random().toString(36).slice(2)}_${Date.now()}`;
  inMemorySessions.set(token, {
    userId: user.id,
    expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000,
  });
  return token;
}

export function invalidateSession(token: string | undefined) {
  if (!token) return;
  inMemorySessions.delete(token);
}

export function getUserByToken(token: string | undefined) {
  if (!token) return null;
  const session = inMemorySessions.get(token);
  if (!session) return null;

  if (session.expiresAt < Date.now()) {
    inMemorySessions.delete(token);
    return null;
  }

  return inMemoryUsers.get(session.userId) ?? null;
}

export function getUserByEmail(email: string) {
  for (const user of inMemoryUsers.values()) {
    if (user.email === email.toLowerCase()) return user;
  }
  return null;
}

export function getOrdersForUser(userId: string) {
  return Array.from(inMemoryOrders.values())
    .filter((order) => order.userId === userId)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export function getAllOrders() {
  return Array.from(inMemoryOrders.values()).sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
}

export function createOrderForUser(userId: string, payload: any) {
  const items = Array.isArray(payload.items) ? payload.items : [];
  if (!items.length) {
    throw new Error('Your bag is empty.');
  }

  const shipping = payload.shipping || {};
  if (!shipping.address || !shipping.city || !shipping.postalCode || !shipping.country) {
    throw new Error('A complete shipping address is required.');
  }

  const normalizedItems: OrderItem[] = items.map((item: any) => {
    const name = String(item.name || '').trim();
    const quantity = Math.max(1, Math.floor(Number(item.quantity) || 1));
    const product = defaultProducts.find((entry) => entry.name === name || entry.id === name);

    if (!product) {
      throw new Error(`The product "${name}" is no longer available.`);
    }

    return {
      name: product.name,
      price: product.price,
      quantity,
    };
  });

  const total = normalizedItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const orderId = `order_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
  const orderNumber = `MRW-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
  const order: OrderRecord = {
    id: orderId,
    orderNumber,
    userId,
    status: 'placed',
    total,
    shipping: {
      address: String(shipping.address || '').trim(),
      city: String(shipping.city || '').trim(),
      postalCode: String(shipping.postalCode || '').trim(),
      country: String(shipping.country || '').trim(),
    },
    receipt: {
      receiptNumber: `RCT-${orderNumber.slice(4)}`,
      paymentMethod: String(payload.receipt?.paymentMethod || 'Card'),
      cardLast4: String(payload.receipt?.cardLast4 || ''),
    },
    items: normalizedItems,
    createdAt: new Date().toISOString(),
  };

  inMemoryOrders.set(orderId, order);
  return order;
}

export function createHash(value: string) {
  return `legacy:${Buffer.from(value).toString('base64')}`;
}

export function passwordMatches(rawPassword: string, storedHash: string) {
  return createHash(rawPassword) === storedHash;
}
