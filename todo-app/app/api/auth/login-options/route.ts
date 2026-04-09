import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticationOptions } from '@/lib/webauthn';
import { getUserByUsername } from '@/lib/auth';
import { z } from 'zod';

const bodySchema = z.object({
  username: z.string().min(3).max(50),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { username } = bodySchema.parse(body);

    const user = getUserByUsername(username);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const options = await getAuthenticationOptions();

    const res = NextResponse.json(options);
    res.cookies.set('webauthn_challenge', options.challenge, {
      httpOnly: true,
      sameSite: 'strict',
      path: '/',
      maxAge: 300,
    });
    return res;
  } catch (error) {
    console.error('Login options error:', error);
    return NextResponse.json({ error: 'Failed to generate options' }, { status: 500 });
  }
}
