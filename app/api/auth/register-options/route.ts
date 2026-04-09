import { NextRequest, NextResponse } from 'next/server';
import { userDB } from '@/lib/db';
import { generateRegistrationOptions } from '@simplewebauthn/server';

const rpName = process.env.RP_NAME || 'Todo App';
const rpID = process.env.RP_ID || 'localhost';

const challengeStore = new Map<string, string>();
export { challengeStore };

export async function POST(request: NextRequest) {
  const { username } = await request.json();

  if (!username || typeof username !== 'string' || !username.trim()) {
    return NextResponse.json({ error: 'Username is required' }, { status: 400 });
  }

  const trimmed = username.trim();
  const existingUser = userDB.findByUsername(trimmed);
  if (existingUser) {
    return NextResponse.json({ error: 'Username already exists' }, { status: 409 });
  }

  const options = await generateRegistrationOptions({
    rpName,
    rpID,
    userName: trimmed,
    attestationType: 'none',
    authenticatorSelection: {
      residentKey: 'preferred',
      userVerification: 'preferred',
    },
  });

  challengeStore.set(trimmed, options.challenge);

  return NextResponse.json(options);
}
