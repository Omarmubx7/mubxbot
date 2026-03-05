import React from "react";
import "./globals.css";
import { Analytics } from "@vercel/analytics/next";
import Providers from "../components/Providers.jsx";

export const metadata = {
  metadataBase: new URL("https://bot.mubx.dev"),
  title: "MUBXBot | HTU School of Computing",
  description: "MUBXBot is the official assistant for the HTU School of Computing and Informatics.",
  openGraph: {
    title: "MUBXBot | HTU School of Computing",
    description: "MUBXBot is the official assistant for the HTU School of Computing and Informatics.",
    images: [
      {
        url: "/og-image.png",
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
    images: ["/og-image.png"],
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
