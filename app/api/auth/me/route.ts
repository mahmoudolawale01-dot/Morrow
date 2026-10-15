import { NextResponse } from 'next/server';
import { getUserByToken, resolveSessionToken } from '@/lib/supabase/live-data';

export async function GET(request: Request) {
  const token = resolveSessionToken(request);
  const user = await getUserByToken(token);

  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  return NextResponse.json({ user: { id: user.id, email: user.email, name: user.name, role: user.role, status: user.status } });
}
