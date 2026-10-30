import React from "react";
import PropTypes from "prop-types";
import "./globals.css";
import { Analytics } from "@vercel/analytics/next";
import { Geist, Geist_Mono } from "next/font/google";
import Providers from "../components/Providers.jsx";

const geist = Geist({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-geist',
});

const geistMono = Geist_Mono({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-geist-mono',
});

const OG_IMAGE_URL = "/og-image.png?v=20260305203255";
const SITE_URL = "https://bot.mubx.dev";
const SITE_NAME = "MUBXBot";
const SITE_TITLE = "MUBXBot | HTU Faculty & Office Hours Assistant";
const SITE_DESCRIPTION = "MUBXBot is an independent, student-built assistant for HTU (Al Hussein Technical University) instructor email lookup, office hours, office locations, and department search. Not affiliated with HTU.";
const GOOGLE_SITE_VERIFICATION = process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION || undefined;
const BING_SITE_VERIFICATION = process.env.NEXT_PUBLIC_BING_SITE_VERIFICATION || undefined;

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
      "@type": "Organization",
      "@id": `${SITE_URL}/#org`,
      name: "MUBX",
      alternateName: "MUBX Studio",
      url: "https://mubx.dev",
      logo: `${SITE_URL}/logo.png`,
      areaServed: "Jordan",
      description: "MUBX is the independent studio behind MUBXBot. MUBXBot is an unofficial student project and is not affiliated with or endorsed by Al Hussein Technical University (HTU)."
    },
    {
      "@type": "SoftwareApplication",
      "@id": `${SITE_URL}/#app`,
      name: SITE_NAME,
      alternateName: ["MUBX Bot", "MUBXBot HTU"],
      applicationCategory: "EducationalApplication",
      operatingSystem: "Web",
      url: SITE_URL,
      description: SITE_DESCRIPTION,
      featureList: [
        "Find instructor emails",
        "Check office hours",
        "Find office locations",
        "Search by department"
      ],
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
    "Al Hussein Technical University",
    "School of Computing and Informatics",
    "HTU faculty search",
    "Jordan faculty search",
    "faculty assistant",
    "faculty directory chatbot",
    "office hours",
    "instructor contact",
    "instructor email",
    "professor office location",
    "department lookup",
    "unofficial HTU assistant"
  ],
  authors: [{ name: "Omar Mubaidin" }],
  creator: "Omar Mubaidin",
  publisher: "MUBX",
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
  verification: {
    google: GOOGLE_SITE_VERIFICATION,
    other: BING_SITE_VERIFICATION ? { "msvalidate.01": BING_SITE_VERIFICATION } : undefined
  },
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
    locale: "en_JO",
    images: [
      {
        url: OG_IMAGE_URL,
        width: 1200,
        height: 630,
        alt: "MUBXBot - HTU Faculty Assistant",
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
    <html lang="en" className={`${geist.variable} ${geistMono.variable} font-sans`}>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, viewport-fit=cover" />
        <link rel="alternate" type="text/plain" hrefLang="en" href="/llms.txt" title="LLM context" />
        <link rel="alternate" type="text/plain" hrefLang="en" href="/llms-full.txt" title="LLM context (extended)" />
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
