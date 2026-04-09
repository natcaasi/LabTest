import { NextRequest, NextResponse } from 'next/server';
import { userDB, authenticatorDB } from '@/lib/db';
import { verifyRegistrationResponse } from '@simplewebauthn/server';
import { isoBase64URL } from '@simplewebauthn/server/helpers';
import { createSession, sessionCookieOptions } from '@/lib/auth';
import { challengeStore } from '../register-options/route';

const rpID = process.env.RP_ID || 'localhost';
const origin = process.env.RP_ORIGIN || 'http://localhost:3000';

export async function POST(request: NextRequest) {
  const { username, credential } = await request.json();

  if (!username || !credential) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
  }

  const trimmed = username.trim();
  const expectedChallenge = challengeStore.get(trimmed);
  if (!expectedChallenge) {
    return NextResponse.json({ error: 'Challenge not found or expired' }, { status: 400 });
  }

  try {
    const verification = await verifyRegistrationResponse({
      response: credential,
      expectedChallenge,
      expectedOrigin: origin,
      expectedRPID: rpID,
    });

    challengeStore.delete(trimmed);

    if (verification.verified && verification.registrationInfo) {
      const { credential: cred } = verification.registrationInfo;

      const user = userDB.create({ username: trimmed });

      // In @simplewebauthn/server v13, cred.id is a base64url string
      const credentialId = String(cred.id);
      const credentialPublicKey = typeof cred.publicKey === 'string'
        ? cred.publicKey
        : Buffer.from(cred.publicKey).toString('base64');

      authenticatorDB.create({
        user_id: user.id,
        credential_id: credentialId,
        credential_public_key: credentialPublicKey,
        counter: cred.counter ?? 0,
        transports: credential.response?.transports?.join(',') || null,
      });

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
