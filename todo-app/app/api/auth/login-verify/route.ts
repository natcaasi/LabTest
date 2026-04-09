import { NextRequest, NextResponse } from 'next/server';
import type { AuthenticationResponseJSON } from '@simplewebauthn/browser';
import { verifyAuthentication } from '@/lib/webauthn';
import {
  getUserByUsername,
  getAuthenticatorByCredentialId,
  createSession,
  updateAuthenticatorSignCount,
} from '@/lib/auth';
import { z } from 'zod';

const bodySchema = z.object({
  username: z.string().min(3).max(50),
  assertionResponse: z.any(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { username, assertionResponse } = bodySchema.parse(body);

    const user = getUserByUsername(username);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const challenge = request.cookies.get('webauthn_challenge')?.value;
    if (!challenge) {
      return NextResponse.json({ error: 'Missing authentication context' }, { status: 400 });
    }

    const credentialIdBuffer = Buffer.from(assertionResponse.id, 'base64url');
    const authenticator = getAuthenticatorByCredentialId(credentialIdBuffer);

    if (!authenticator) {
      return NextResponse.json({ error: 'Credential not found' }, { status: 400 });
    }

    const verification = await verifyAuthentication(
      assertionResponse as AuthenticationResponseJSON,
      challenge,
      authenticator.public_key,
      authenticator.sign_count
    );

    if (!verification.verified) {
      return NextResponse.json({ error: 'Verification failed' }, { status: 400 });
    }

    const newCount = (verification as unknown as { authenticationInfo?: { newCounter?: number } })
      .authenticationInfo?.newCounter ?? authenticator.sign_count;
    updateAuthenticatorSignCount(authenticator.id, newCount);

    const token = await createSession(user.id, user.username);

    const res = NextResponse.json({ success: true, token });
    res.cookies.set('session', token, {
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7,
    });
    res.cookies.delete('webauthn_challenge');
    return res;
  } catch (error) {
    console.error('Login verification error:', error);
    return NextResponse.json({ error: 'Login failed' }, { status: 500 });
  }
}
