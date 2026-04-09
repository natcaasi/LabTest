import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';

const SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'default-dev-secret-change-in-production-32chars!'
);

export async function createSession(userId: number): Promise<string> {
  return new SignJWT({ userId })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('7d')
    .sign(SECRET);
}

export async function getSession(): Promise<{ userId: number } | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get('session')?.value;
  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, SECRET);
    return { userId: payload.userId as number };
  } catch {
    return null;
  }
}

export function sessionCookieOptions(token: string) {
  return {
    name: 'session',
    value: token,
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict' as const,
    maxAge: 60 * 60 * 24 * 7,
    path: '/',
  };
}
