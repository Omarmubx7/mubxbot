import { NextResponse } from 'next/server';

const ADMIN_SESSION_COOKIE = 'mubx_admin_session';

export function middleware(req) {
  const { pathname } = req.nextUrl;

  const applyNoIndexHeaders = (response) => {
    response.headers.set('X-Robots-Tag', 'noindex, nofollow, noarchive');
    return response;
  };

  if (pathname.startsWith('/api/admin/auth/')) {
    return applyNoIndexHeaders(NextResponse.next());
  }

  if (pathname.startsWith('/admin-login')) {
    return applyNoIndexHeaders(NextResponse.next());
  }

  if (pathname.startsWith('/admin') || pathname.startsWith('/api/admin')) {
    const hasSession = Boolean(req.cookies.get(ADMIN_SESSION_COOKIE)?.value);

    if (!hasSession) {
      const loginUrl = new URL('/admin-login', req.url);
      loginUrl.searchParams.set('next', pathname);
      return applyNoIndexHeaders(NextResponse.redirect(loginUrl));
    }

    return applyNoIndexHeaders(NextResponse.next());
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*', '/api/admin/:path*', '/admin-login']
};
