import { NextResponse } from 'next/server';
import {
  createSessionForUser,
  getUserByEmail,
  SESSION_COOKIE_NAME,
  validatePassword,
} from '@/lib/supabase/live-data';

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const email = String(body.email || '').trim().toLowerCase();
  const password = String(body.password || '');

  const user = await getUserByEmail(email);
  if (!user || user.status !== 'active' || !(await validatePassword(password, user.passwordHash))) {
    return NextResponse.json({ error: 'The email or password is incorrect.' }, { status: 401 });
  }

  const sessionToken = await createSessionForUser(user.id, user.email);
  const response = NextResponse.json({
    user: { id: user.id, email: user.email, name: user.name, role: user.role, status: user.status },
  });

  response.cookies.set(SESSION_COOKIE_NAME, sessionToken, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 60 * 60 * 24 * 7,
  });

  return response;
}
