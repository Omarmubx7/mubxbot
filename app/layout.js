import React from "react";
import "./globals.css";
import { Analytics } from "@vercel/analytics/next";
import Providers from "../components/Providers.jsx";

export const metadata = {
  metadataBase: new URL("https://bot.mubx.dev"),
  title: "MBOT | HTU School of Computing",
  description: "Official Computing Directory for HTU School of Computing and Informatics.",
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
