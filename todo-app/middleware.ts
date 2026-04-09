import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'dev-secret-change-in-production'
);
const COOKIE_NAME = 'session';

const PROTECTED_API = ['/api/todos', '/api/tags', '/api/templates', '/api/notifications'];
const PROTECTED_PAGES = ['/', '/calendar'];

async function isValid(token: string | undefined): Promise<boolean> {
  if (!token) return false;
  try {
    await jwtVerify(token, JWT_SECRET);
    return true;
  } catch {
    return false;
  }
}

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const token = request.cookies.get(COOKIE_NAME)?.value;
  const authed = await isValid(token);

  if (PROTECTED_API.some((r) => pathname.startsWith(r))) {
    if (!authed) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  if (PROTECTED_PAGES.includes(pathname) && !authed) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  if (pathname === '/login' && authed) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/api/:path*', '/login', '/', '/calendar'],
};
