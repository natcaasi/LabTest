import jwt from 'jsonwebtoken';
import { cookies } from 'next/headers';
import { queryOne, execute } from './db';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-in-production';
const COOKIE_NAME = 'session';
const SESSION_DURATION = 7 * 24 * 60 * 60 * 1000;

export interface SessionData {
  userId: number;
  username: string;
  iat: number;
  exp: number;
}

export async function createSession(userId: number, username: string): Promise<string> {
  const payload: Omit<SessionData, 'iat' | 'exp'> = { userId, username };
  const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });

  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: SESSION_DURATION / 1000,
    path: '/',
  });

  return token;
}

export async function getSession(): Promise<SessionData | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(COOKIE_NAME)?.value;

    if (!token) return null;

    const decoded = jwt.verify(token, JWT_SECRET) as SessionData;
    return decoded;
  } catch {
    return null;
  }
}

export async function deleteSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}

export async function requireAuth(): Promise<SessionData> {
  const session = await getSession();
  if (!session) {
    throw new Error('Unauthorized');
  }
  return session;
}

export interface User {
  id: number;
  username: string;
  created_at: string;
}

export function getUserById(id: number): User | undefined {
  return queryOne<User>('SELECT id, username, created_at FROM users WHERE id = ?', [id]);
}

export function getUserByUsername(username: string): User | undefined {
  return queryOne<User>('SELECT id, username, created_at FROM users WHERE username = ?', [
    username,
  ]);
}

export function createUser(username: string): User {
  const result = execute('INSERT INTO users (username) VALUES (?)', [username]);
  const user = getUserById(Number(result.lastInsertRowid));
  if (!user) throw new Error('Failed to create user');
  return user;
}

export interface Authenticator {
  id: number;
  user_id: number;
  credential_id: Buffer;
  public_key: Buffer;
  sign_count: number;
  created_at: string;
}

export function getAuthenticatorByUserId(userId: number): Authenticator | undefined {
  const result = queryOne<{
    id: number;
    user_id: number;
    credential_id: Buffer;
    public_key: Buffer;
    sign_count: number;
    created_at: string;
  }>('SELECT * FROM authenticators WHERE user_id = ?', [userId]);

  if (!result) return undefined;

  return {
    ...result,
    credential_id: Buffer.isBuffer(result.credential_id)
      ? result.credential_id
      : Buffer.from(result.credential_id),
    public_key: Buffer.isBuffer(result.public_key)
      ? result.public_key
      : Buffer.from(result.public_key),
  };
}

export function getAuthenticatorByCredentialId(credentialId: Buffer): Authenticator | undefined {
  const result = queryOne<{
    id: number;
    user_id: number;
    credential_id: Buffer;
    public_key: Buffer;
    sign_count: number;
    created_at: string;
  }>('SELECT * FROM authenticators WHERE credential_id = ?', [credentialId]);

  if (!result) return undefined;

  return {
    ...result,
    credential_id: Buffer.isBuffer(result.credential_id)
      ? result.credential_id
      : Buffer.from(result.credential_id),
    public_key: Buffer.isBuffer(result.public_key)
      ? result.public_key
      : Buffer.from(result.public_key),
  };
}

export function createAuthenticator(
  userId: number,
  credentialId: Buffer,
  publicKey: Buffer,
  signCount: number = 0
): Authenticator {
  execute(
    'INSERT INTO authenticators (user_id, credential_id, public_key, sign_count) VALUES (?, ?, ?, ?)',
    [userId, credentialId, publicKey, signCount]
  );

  const auth = getAuthenticatorByUserId(userId);
  if (!auth) throw new Error('Failed to create authenticator');
  return auth;
}

export function updateAuthenticatorSignCount(authenticatorId: number, signCount: number): void {
  execute('UPDATE authenticators SET sign_count = ? WHERE id = ?', [signCount, authenticatorId]);
}
