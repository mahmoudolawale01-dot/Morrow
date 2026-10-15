import { NextResponse } from 'next/server';
import { getAllOrders, getUserById, getUserByToken, resolveSessionToken } from '@/lib/supabase/live-data';

export async function GET(request: Request) {
  const user = await getUserByToken(resolveSessionToken(request));

  if (!user) {
    return NextResponse.json({ error: 'Please sign in to continue.' }, { status: 401 });
  }

  if (user.role !== 'admin') {
    return NextResponse.json({ error: 'You do not have access to this resource.' }, { status: 403 });
  }

  const orders = await getAllOrders();
  const result = [] as any[];

  for (const order of orders) {
    const buyer = await getUserById(order.userId);
    result.push({
      ...order,
      buyer: {
        name: buyer?.name ?? 'Unknown',
        email: buyer?.email ?? '',
      },
    });
  }

  return NextResponse.json({ orders: result });
}
