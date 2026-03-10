export const metadata = {
  title: 'MUBX Admin Login',
  description: 'Secure login for the MUBXBot admin area.',
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

export default function AdminLoginLayout({ children }) {
  return children;
}
