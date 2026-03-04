import { NextResponse } from 'next/server';

export function middleware(req) {
  const { pathname } = req.nextUrl;
  if (pathname.startsWith('/admin')) {
    const auth = req.headers.get('authorization') || '';
    const expectedUser = process.env.ADMIN_USER;
    const expectedPass = process.env.ADMIN_PASS;
    if (!expectedUser || !expectedPass) {
      // If credentials are not configured, allow access in non-production for local development
      if (process.env.NODE_ENV !== 'production') {
        console.warn('ADMIN_USER/ADMIN_PASS not set — allowing /admin access in development only');
      } else {
        return new NextResponse('Admin access disabled (no credentials configured)', { status: 403 });
      }
    }
    const match = auth.match(/^Basic\s+(.*)$/i);
    if (!match) {
      const res = new NextResponse('Authentication required', { status: 401 });
      res.headers.set('WWW-Authenticate', 'Basic realm="Admin"');
      return res;
    }
    let creds = '';
    try {
      creds = typeof atob === 'function' ? atob(match[1]) : Buffer.from(match[1], 'base64').toString();
    } catch (e) {
      const res = new NextResponse('Invalid authentication token', { status: 400 });
      return res;
    }
    const [user, pass] = creds.split(':');
    if (user !== expectedUser || pass !== expectedPass) {
      const res = new NextResponse('Invalid credentials', { status: 401 });
      res.headers.set('WWW-Authenticate', 'Basic realm="Admin"');
      return res;
    }
  }
  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*']
};
