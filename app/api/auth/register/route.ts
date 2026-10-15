import { NextResponse } from 'next/server';
import {
  createSessionForUser,
  createUserAccount,
  getUserByEmail,
  SESSION_COOKIE_NAME,
} from '@/lib/supabase/live-data';

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const email = String(body.email || '').trim().toLowerCase();
  const name = String(body.name || '').trim();
  const password = String(body.password || '');

  if (!email || !name || password.length < 8) {
    return NextResponse.json(
      { error: 'Name, email, and a password of at least 8 characters are required.' },
      { status: 400 },
    );
  }

  const existingUser = await getUserByEmail(email);
  if (existingUser) {
    return NextResponse.json({ error: 'An account already exists for that email.' }, { status: 409 });
  }

  try {
    const user = await createUserAccount(email, name, password);
    if (!user) {
      throw new Error('Unable to create the account.');
    }

    const sessionToken = await createSessionForUser(user.id, user.email);

    const response = NextResponse.json({ user: { ...user, passwordHash: undefined } }, { status: 201 });
    response.cookies.set(SESSION_COOKIE_NAME, sessionToken, {
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 60 * 24 * 7,
    });

    return response;
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unable to create the account.' },
      { status: 500 },
    );
  }
}
