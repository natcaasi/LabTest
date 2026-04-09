import { NextRequest, NextResponse } from 'next/server';
import type { RegistrationResponseJSON } from '@simplewebauthn/browser';
import { verifyRegistration } from '@/lib/webauthn';
import { createUser, createAuthenticator, createSession } from '@/lib/auth';
import { z } from 'zod';

const bodySchema = z.object({
  username: z.string().min(3).max(50),
  attestationResponse: z.any(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { username, attestationResponse } = bodySchema.parse(body);

    const challenge = request.cookies.get('webauthn_challenge')?.value;
    if (!challenge) {
      return NextResponse.json({ error: 'Missing registration context' }, { status: 400 });
    }

    const verification = await verifyRegistration(
      attestationResponse as RegistrationResponseJSON,
      challenge
    );

    if (!verification.verified || !verification.registrationInfo) {
      return NextResponse.json({ error: 'Verification failed' }, { status: 400 });
    }

    const user = createUser(username);

    const info = verification.registrationInfo as unknown as {
      credentialID: Uint8Array | ArrayBuffer;
      credentialPublicKey: Uint8Array | ArrayBuffer;
      counter: number;
    };
    const credentialId = Buffer.from(info.credentialID as Uint8Array);
    const publicKey = Buffer.from(info.credentialPublicKey as Uint8Array);

    createAuthenticator(user.id, credentialId, publicKey, info.counter ?? 0);

    const token = await createSession(user.id, user.username);

    const res = NextResponse.json({ success: true, token });
    res.cookies.set('session', token, {
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7,
    });
    res.cookies.delete('webauthn_challenge');
    res.cookies.delete('webauthn_username');
    return res;
  } catch (error) {
    console.error('Registration verification error:', error);
    return NextResponse.json({ error: 'Registration failed' }, { status: 500 });
  }
}
