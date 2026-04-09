import { NextRequest, NextResponse } from 'next/server';
import { userDB, authenticatorDB } from '@/lib/db';
import { generateAuthenticationOptions } from '@simplewebauthn/server';

const rpID = process.env.RP_ID || 'localhost';

const loginChallengeStore = new Map<string, string>();
export { loginChallengeStore };

export async function POST(request: NextRequest) {
  const { username } = await request.json();

  if (!username || typeof username !== 'string' || !username.trim()) {
    return NextResponse.json({ error: 'Username is required' }, { status: 400 });
  }

  const trimmed = username.trim();
  const user = userDB.findByUsername(trimmed);
  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  const authenticators = authenticatorDB.findByUserId(user.id);
  if (authenticators.length === 0) {
    return NextResponse.json({ error: 'No authenticators registered' }, { status: 400 });
  }

  const options = await generateAuthenticationOptions({
    rpID,
    allowCredentials: authenticators.map(auth => ({
      id: auth.credential_id,
      transports: auth.transports?.split(',').filter(Boolean) as AuthenticatorTransport[] || [],
    })),
    userVerification: 'preferred',
  });

  loginChallengeStore.set(trimmed, options.challenge);

  return NextResponse.json(options);
}
