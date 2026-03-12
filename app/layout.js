import React from "react";
import PropTypes from "prop-types";
import "./globals.css";
import { Analytics } from "@vercel/analytics/next";
import Providers from "../components/Providers.jsx";

const OG_IMAGE_URL = "/og-image.png?v=20260305203255";

export const metadata = {
  metadataBase: new URL("https://bot.mubx.dev"),
  title: "MUBXBot | HTU School of Computing",
  description: "MUBXBot is the official assistant for the HTU School of Computing and Informatics.",
  openGraph: {
    title: "MUBXBot | HTU School of Computing",
    description: "MUBXBot is the official assistant for the HTU School of Computing and Informatics.",
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
    title: "MUBXBot | HTU School of Computing",
    description: "MUBXBot is the official assistant for the HTU School of Computing and Informatics.",
    images: [OG_IMAGE_URL],
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, viewport-fit=cover" />
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="manifest" href="/site.webmanifest" />
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
