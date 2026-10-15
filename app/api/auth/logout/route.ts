import { NextResponse } from 'next/server';
import { invalidateSessionToken, resolveSessionToken, SESSION_COOKIE_NAME } from '@/lib/supabase/live-data';

export async function POST(request: Request) {
  const token = resolveSessionToken(request);
  await invalidateSessionToken(token);

  const response = NextResponse.json({ ok: true });
  response.cookies.set(SESSION_COOKIE_NAME, '', {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 0,
  });

  return response;
}
