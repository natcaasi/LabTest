import { NextRequest, NextResponse } from 'next/server';
import { getRegistrationOptions } from '@/lib/webauthn';
import { getUserByUsername } from '@/lib/auth';
import { z } from 'zod';

const bodySchema = z.object({
  username: z.string().min(3).max(50),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { username } = bodySchema.parse(body);

    const existingUser = getUserByUsername(username);
    if (existingUser) {
      return NextResponse.json({ error: 'Username already exists' }, { status: 400 });
    }

    const options = await getRegistrationOptions(username);

    const res = NextResponse.json(options);
    res.cookies.set('webauthn_challenge', options.challenge, {
      httpOnly: true,
      sameSite: 'strict',
      path: '/',
      maxAge: 300,
    });
    res.cookies.set('webauthn_username', username, {
      httpOnly: true,
      sameSite: 'strict',
      path: '/',
      maxAge: 300,
    });
    return res;
  } catch (error) {
    console.error('Registration options error:', error);
    return NextResponse.json({ error: 'Failed to generate options' }, { status: 500 });
  }
}
