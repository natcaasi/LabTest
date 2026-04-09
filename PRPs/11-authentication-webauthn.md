# PRP 11: Authentication (WebAuthn / Passkeys)

## Feature Overview

The app uses **WebAuthn/Passkeys** for passwordless authentication. Users register with a username and a device authenticator (fingerprint, Face ID, security key), then log in using the same passkey. Sessions are managed via **JWT tokens** stored in **HTTP-only cookies** with a 7-day expiry. A middleware layer protects all authenticated routes (`/` and `/calendar`). The entire flow uses `@simplewebauthn/server` (backend) and `@simplewebauthn/browser` (frontend).

---

## User Stories

### As a new user
- I want to register with my username and fingerprint so I have a secure, passwordless account.

### As a returning user
- I want to log in with my passkey so I can access my todos without remembering a password.

### As a security-conscious user
- I want my session to expire after 7 days so stale sessions don't remain active indefinitely.

### As any user
- I want to log out and know my session cookie is cleared immediately.

---

## User Flow

### Registration
1. User navigates to the app (unauthenticated → sees login/register page)
2. User enters a **unique username**
3. User clicks **"Register"**
4. Browser prompts for authenticator (fingerprint, Face ID, security key)
5. User completes biometric/key verification
6. Server verifies the credential and creates the user
7. JWT session cookie set; user redirected to todo list

### Login
1. User enters their **registered username**
2. User clicks **"Login"**
3. Browser prompts for authenticator
4. User completes biometric/key verification
5. Server verifies credential against stored authenticator
6. JWT session cookie set; user redirected to todo list

### Logout
1. User clicks **"Logout"** button (top-right)
2. Session cookie cleared
3. User redirected to login page

### Session Expiry
1. JWT expires after 7 days
2. Next request detected as unauthenticated by middleware
3. User redirected to login page

---

## Technical Requirements

### Database Tables

#### `users` Table
```sql
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  created_at TEXT DEFAULT (datetime('now'))
);
```

#### `authenticators` Table
```sql
CREATE TABLE IF NOT EXISTS authenticators (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  credential_id TEXT NOT NULL,
  credential_public_key TEXT NOT NULL,
  counter INTEGER DEFAULT 0,
  transports TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
```

### API Endpoints

#### Registration Flow (2-step)

**Step 1 — Get registration options:**
```
POST /api/auth/register-options
Body: { "username": "alice" }
Response: PublicKeyCredentialCreationOptions (challenge, RP info, user info)
```

```typescript
// app/api/auth/register-options/route.ts
export async function POST(request: NextRequest) {
  const { username } = await request.json();

  if (!username || typeof username !== 'string' || !username.trim()) {
    return NextResponse.json({ error: 'Username is required' }, { status: 400 });
  }

  // Check if username already taken
  const existingUser = userDB.findByUsername(username.trim());
  if (existingUser) {
    return NextResponse.json({ error: 'Username already exists' }, { status: 409 });
  }

  const options = await generateRegistrationOptions({
    rpName: 'Todo App',
    rpID: rpID,
    userName: username.trim(),
    attestationType: 'none',
    authenticatorSelection: {
      residentKey: 'preferred',
      userVerification: 'preferred',
    },
  });

  // Store challenge temporarily (in-memory map or DB)
  challengeStore.set(username, options.challenge);

  return NextResponse.json(options);
}
```

**Step 2 — Verify registration:**
```
POST /api/auth/register-verify
Body: { "username": "alice", "credential": <AuthenticatorAttestationResponse> }
Response: { "verified": true }
Set-Cookie: session=<JWT>
```

```typescript
// app/api/auth/register-verify/route.ts
export async function POST(request: NextRequest) {
  const { username, credential } = await request.json();
  const expectedChallenge = challengeStore.get(username);

  const verification = await verifyRegistrationResponse({
    response: credential,
    expectedChallenge,
    expectedOrigin: origin,
    expectedRPID: rpID,
  });

  if (verification.verified && verification.registrationInfo) {
    const { credential: cred } = verification.registrationInfo;

    // Create user
    const user = userDB.create({ username: username.trim() });

    // Store authenticator — use ?? 0 for counter
    authenticatorDB.create({
      user_id: user.id,
      credential_id: isoBase64URL.fromBuffer(cred.id),
      credential_public_key: Buffer.from(cred.publicKey).toString('base64'),
      counter: cred.counter ?? 0,
      transports: credential.response.transports?.join(',') || null,
    });

    // Create JWT session
    const token = await createSession(user.id);
    const response = NextResponse.json({ verified: true });
    response.cookies.set('session', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: '/',
    });

    return response;
  }

  return NextResponse.json({ error: 'Verification failed' }, { status: 400 });
}
```

#### Login Flow (2-step)

**Step 1 — Get login options:**
```
POST /api/auth/login-options
Body: { "username": "alice" }
Response: PublicKeyCredentialRequestOptions (challenge, allowed credentials)
```

**Step 2 — Verify login:**
```
POST /api/auth/login-verify
Body: { "username": "alice", "credential": <AuthenticatorAssertionResponse> }
Response: { "verified": true }
Set-Cookie: session=<JWT>
```

Key implementation detail — **always use `?? 0` for counter**:
```typescript
const verification = await verifyAuthenticationResponse({
  response: credential,
  expectedChallenge,
  expectedOrigin: origin,
  expectedRPID: rpID,
  credential: {
    id: authenticator.credential_id,
    publicKey: new Uint8Array(Buffer.from(authenticator.credential_public_key, 'base64')),
    counter: authenticator.counter ?? 0,  // CRITICAL: handle undefined
    transports: authenticator.transports?.split(',') || [],
  },
});
```

#### Logout
```
POST /api/auth/logout
Response: 200 (clears session cookie)
```

### Session Management (`lib/auth.ts`)

```typescript
import { SignJWT, jwtVerify } from 'jose';

const SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'default-secret-change-in-production');

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
```

### Middleware (`middleware.ts`)

```typescript
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const session = request.cookies.get('session');
  const { pathname } = request.nextUrl;

  // Protected routes
  if ((pathname === '/' || pathname.startsWith('/calendar')) && !session) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // Redirect authenticated users away from login
  if (pathname === '/login' && session) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/', '/calendar', '/login'],
};
```

### Buffer & Encoding

WebAuthn credentials require base64/base64url conversions:
```typescript
import { isoBase64URL } from '@simplewebauthn/server/helpers';

// Encoding credential ID for storage
const credentialId = isoBase64URL.fromBuffer(cred.id);

// Decoding for verification
const credentialIdBuffer = isoBase64URL.toBuffer(authenticator.credential_id);
```

---

## UI Components

### Login/Register Page (`app/login/page.tsx`)

```tsx
'use client';
import { startRegistration, startAuthentication } from '@simplewebauthn/browser';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [error, setError] = useState('');

  async function handleRegister() {
    const optionsRes = await fetch('/api/auth/register-options', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username }),
    });
    const options = await optionsRes.json();
    if (optionsRes.status !== 200) { setError(options.error); return; }

    const credential = await startRegistration({ optionsJSON: options });

    const verifyRes = await fetch('/api/auth/register-verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, credential }),
    });
    if (verifyRes.ok) window.location.href = '/';
    else setError('Registration failed');
  }

  async function handleLogin() {
    const optionsRes = await fetch('/api/auth/login-options', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username }),
    });
    const options = await optionsRes.json();
    if (optionsRes.status !== 200) { setError(options.error); return; }

    const credential = await startAuthentication({ optionsJSON: options });

    const verifyRes = await fetch('/api/auth/login-verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, credential }),
    });
    if (verifyRes.ok) window.location.href = '/';
    else setError('Login failed');
  }

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="bg-white dark:bg-gray-800 p-8 rounded-lg shadow-lg w-full max-w-md">
        <h1 className="text-2xl font-bold mb-6 text-center">Todo App</h1>
        {error && <div className="bg-red-100 text-red-700 p-2 rounded mb-4">{error}</div>}
        <input
          value={username}
          onChange={e => setUsername(e.target.value)}
          placeholder="Enter username"
          className="w-full p-3 border rounded mb-4 dark:bg-gray-700"
        />
        <div className="flex gap-2">
          <button onClick={handleRegister} className="flex-1 bg-green-500 text-white py-3 rounded">
            Register
          </button>
          <button onClick={handleLogin} className="flex-1 bg-blue-500 text-white py-3 rounded">
            Login
          </button>
        </div>
      </div>
    </div>
  );
}
```

### Logout Button (in `app/page.tsx`)

```tsx
<button
  onClick={async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    window.location.href = '/login';
  }}
  className="text-red-600 hover:underline"
>
  Logout
</button>
```

---

## Edge Cases

| Scenario | Expected Behavior |
|---|---|
| Username already taken | 409 error: "Username already exists" |
| Empty username | 400 error: "Username is required" |
| Username with whitespace only | Trimmed → treated as empty → 400 |
| Browser doesn't support WebAuthn | Error shown; registration/login not possible |
| User cancels authenticator prompt | Error caught; message shown |
| Challenge expired or replayed | Verification fails; 400 error |
| `counter` field undefined in DB | `?? 0` prevents crash |
| JWT token tampered with | `jwtVerify` throws; `getSession()` returns null |
| Session cookie missing | Middleware redirects to `/login` |
| JWT expired (>7 days) | `getSession()` returns null; middleware redirects |
| Already authenticated user visits `/login` | Redirected to `/` |
| Multiple authenticators per user | Supported (one-to-many relationship) |
| User deleted | CASCADE removes authenticators |

---

## Acceptance Criteria

- [ ] User can register with username + authenticator (fingerprint/Face ID/key)
- [ ] Duplicate usernames are rejected with clear error message
- [ ] User can log in with registered passkey
- [ ] JWT session cookie set as HTTP-only, secure (in prod), sameSite strict
- [ ] Session expires after 7 days
- [ ] Logout clears session cookie
- [ ] Middleware protects `/` and `/calendar` — redirects to `/login`
- [ ] Middleware redirects authenticated users from `/login` to `/`
- [ ] WebAuthn counter uses `?? 0` to handle undefined values
- [ ] Credential IDs encoded/decoded correctly with `isoBase64URL`
- [ ] Error messages shown for: empty username, existing username, failed verification
- [ ] User cannot access any API endpoints without valid session

---

## Testing Requirements

### E2E Tests (Playwright — `tests/01-authentication.spec.ts`)

Playwright uses **virtual WebAuthn authenticators** (Chromium `--enable-features=WebAuthenticationVirtualAuthenticators`):

```typescript
test.describe('Authentication', () => {
  test('should show login page when not authenticated', async ({ page }) => {});
  test('should register a new user with passkey', async ({ page }) => {});
  test('should reject duplicate username on registration', async ({ page }) => {});
  test('should login with registered passkey', async ({ page }) => {});
  test('should redirect to todo list after login', async ({ page }) => {});
  test('should logout and redirect to login page', async ({ page }) => {});
  test('should protect routes when not authenticated', async ({ page }) => {});
  test('should show error for empty username', async ({ page }) => {});
});
```

**Playwright Config** (`playwright.config.ts`):
```typescript
use: {
  timezoneId: 'Asia/Singapore',
  launchOptions: {
    args: [
      '--enable-features=WebAuthenticationVirtualAuthenticators',
    ],
  },
},
```

**Test Helper** (`tests/helpers.ts`):
```typescript
async function registerUser(page: Page, username: string) {
  // Set up virtual authenticator via CDP
  const client = await page.context().newCDPSession(page);
  await client.send('WebAuthn.enable');
  await client.send('WebAuthn.addVirtualAuthenticator', {
    options: {
      protocol: 'ctap2',
      transport: 'internal',
      hasResidentKey: true,
      hasUserVerification: true,
      isUserVerified: true,
    },
  });

  await page.fill('[placeholder="Enter username"]', username);
  await page.click('text=Register');
  await page.waitForURL('/');
}
```

---

## Out of Scope

- Password-based authentication
- Social login (Google, GitHub, etc.)
- Multi-factor authentication (MFA)
- Email verification
- Password reset flow
- User profile management
- Role-based access control (RBAC)
- OAuth2 / OpenID Connect
- Rate limiting on auth endpoints (separate concern)
- Account deletion UI (admin only)

---

## Success Metrics

| Metric | Target |
|---|---|
| Registration → Login round-trip succeeds | 100% with supported browsers |
| Session cookie is HTTP-only and SameSite strict | 100% |
| Unauthenticated access blocked by middleware | 100% of protected routes |
| Virtual authenticator tests pass | 8/8 tests |
| Counter `?? 0` prevents undefined errors | 0 crashes from counter field |
