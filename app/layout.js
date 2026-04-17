import React from "react";
import PropTypes from "prop-types";
import "./globals.css";
import { Analytics } from "@vercel/analytics/next";
import { Roboto } from "next/font/google";
import Providers from "../components/Providers.jsx";

const roboto = Roboto({
  weight: ['100', '300', '400', '500', '700', '900'],
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-roboto',
});

const OG_IMAGE_URL = "/og-image.png?v=20260305203255";
const SITE_URL = "https://bot.mubx.dev";
const SITE_NAME = "MUBXBot";
const SITE_TITLE = "MUBXBot | HTU School of Computing";
const SITE_DESCRIPTION = "MUBXBot is the official assistant for the HTU School of Computing and Informatics.";

const structuredData = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebSite",
      "@id": `${SITE_URL}/#website`,
      url: SITE_URL,
      name: SITE_NAME,
      description: SITE_DESCRIPTION,
      inLanguage: "en",
      publisher: {
        "@id": `${SITE_URL}/#org`
      },
      potentialAction: {
        "@type": "SearchAction",
        target: `${SITE_URL}/?q={search_term_string}`,
        "query-input": "required name=search_term_string"
      }
    },
    {
      "@type": "EducationalOrganization",
      "@id": `${SITE_URL}/#org`,
      name: "HTU School of Computing and Informatics",
      url: SITE_URL,
      logo: `${SITE_URL}/logo.png`
    },
    {
      "@type": "SoftwareApplication",
      "@id": `${SITE_URL}/#app`,
      name: SITE_NAME,
      applicationCategory: "EducationalApplication",
      operatingSystem: "Web",
      url: SITE_URL,
      description: SITE_DESCRIPTION,
      provider: {
        "@id": `${SITE_URL}/#org`
      }
    }
  ]
};

export const metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: SITE_TITLE,
    template: `%s | ${SITE_NAME}`
  },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  referrer: "origin-when-cross-origin",
  keywords: [
    "MUBXBot",
    "HTU",
    "School of Computing and Informatics",
    "faculty assistant",
    "office hours",
    "instructor contact"
  ],
  authors: [{ name: "Omar Mubaidin" }],
  creator: "Omar Mubaidin",
  publisher: "HTU School of Computing and Informatics",
  category: "education",
  alternates: {
    canonical: "/"
  },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" }
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180" }]
  },
  manifest: "/site.webmanifest",
  robots: {
    index: true,
    follow: true,
    nocache: false,
    googleBot: {
      index: true,
      follow: true,
      noimageindex: false,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1
    }
  },
  openGraph: {
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    url: SITE_URL,
    siteName: SITE_NAME,
    locale: "en_US",
    images: [
      {
        url: OG_IMAGE_URL,
        width: 1200,
        height: 630,
        alt: "MUBXBot - HTU School of Computing",
      },
    ],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    images: [OG_IMAGE_URL],
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${roboto.variable} font-sans`}>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, viewport-fit=cover" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
        />
      </head>
      <body>
        <Providers>
          {children}
        </Providers>
        <Analytics />
      </body>
    </html>
  );
}

RootLayout.propTypes = {
  children: PropTypes.node.isRequired,
};
