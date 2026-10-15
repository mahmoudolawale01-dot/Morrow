import { NextResponse } from 'next/server';
import {
  createOrderForUser,
  getOrdersForUser,
  getUserByToken,
  resolveSessionToken,
} from '@/lib/supabase/live-data';

export async function GET(request: Request) {
  const token = resolveSessionToken(request);
  const user = await getUserByToken(token);

  if (!user) {
    return NextResponse.json({ error: 'Please sign in to continue.' }, { status: 401 });
  }

  const orders = await getOrdersForUser(user.id);
  return NextResponse.json({ orders });
}

export async function POST(request: Request) {
  const token = resolveSessionToken(request);
  const user = await getUserByToken(token);

  if (!user) {
    return NextResponse.json({ error: 'Please sign in to continue.' }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));

  try {
    const order = await createOrderForUser(user.id, body);
    return NextResponse.json({ order }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unable to place order.' },
      { status: 400 },
    );
  }
}
