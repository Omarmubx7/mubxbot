import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { ADMIN_SESSION_COOKIE, verifyAdminSessionToken } from '../../lib/adminAuth.js';

export const metadata = {
  title: 'MUBX Admin',
  description: 'MUBXBot administrative control center.',
  icons: {
    icon: '/admin-control-logo.svg',
    shortcut: '/admin-control-logo.svg',
    apple: '/admin-control-logo.svg'
  },
  robots: {
    index: false,
    follow: false,
    nocache: true,
    googleBot: {
      index: false,
      follow: false,
      noimageindex: true,
      'max-snippet': 0,
      'max-image-preview': 'none',
      'max-video-preview': 0
    }
  }
};

export default async function AdminLayout({ children }) {
  const cookieStore = await cookies();
  const token = cookieStore.get(ADMIN_SESSION_COOKIE)?.value || '';

  if (!verifyAdminSessionToken(token)) {
    redirect('/admin-login?next=/admin');
  }

  return children;
}
