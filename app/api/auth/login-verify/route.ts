import { NextRequest, NextResponse } from 'next/server';
import { userDB, authenticatorDB } from '@/lib/db';
import { verifyAuthenticationResponse } from '@simplewebauthn/server';
import { createSession, sessionCookieOptions } from '@/lib/auth';
import { loginChallengeStore } from '../login-options/route';

const rpID = process.env.RP_ID || 'localhost';
const origin = process.env.RP_ORIGIN || 'http://localhost:3000';

export async function POST(request: NextRequest) {
  const { username, credential } = await request.json();

  if (!username || !credential) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
  }

  const trimmed = username.trim();
  const expectedChallenge = loginChallengeStore.get(trimmed);
  if (!expectedChallenge) {
    return NextResponse.json({ error: 'Challenge not found or expired' }, { status: 400 });
  }

  const user = userDB.findByUsername(trimmed);
  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  const authenticators = authenticatorDB.findByUserId(user.id);
  const authenticator = authenticators.find(
    a => a.credential_id === credential.id
  );

  if (!authenticator) {
    return NextResponse.json({ error: 'Authenticator not found' }, { status: 400 });
  }

  try {
    const verification = await verifyAuthenticationResponse({
      response: credential,
      expectedChallenge,
      expectedOrigin: origin,
      expectedRPID: rpID,
      credential: {
        id: authenticator.credential_id,
        publicKey: new Uint8Array(Buffer.from(authenticator.credential_public_key, 'base64')),
        counter: authenticator.counter ?? 0,
        transports: (authenticator.transports?.split(',').filter(Boolean) || []) as ("ble" | "cable" | "hybrid" | "internal" | "nfc" | "smart-card" | "usb")[],
      },
    });

    loginChallengeStore.delete(trimmed);

    if (verification.verified) {
      authenticatorDB.updateCounter(authenticator.id, verification.authenticationInfo.newCounter);
      const token = await createSession(user.id);
      const response = NextResponse.json({ verified: true });
      response.cookies.set(sessionCookieOptions(token));
      return response;
    }

    return NextResponse.json({ error: 'Verification failed' }, { status: 400 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Verification failed';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
