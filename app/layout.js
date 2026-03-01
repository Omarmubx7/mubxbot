"use client";

import React, { useState, useEffect, createContext, useContext } from "react";
import "./globals.css";
import { Analytics } from "@vercel/analytics/next";

// Create Context
const DoctorsContext = createContext();

export const useDoctors = () => useContext(DoctorsContext);

export const metadata = {
  metadataBase: new URL("https://mbot.mubx.dev"),
  title: "MubxBot | HTU School of Computing",
  description: "Official Computing Directory for HTU School of Computing and Informatics.",
};

export default function RootLayout({ children }) {
  const [theme, setTheme] = useState("light");
  const [instructors, setInstructors] = useState([]);
  const [loading, setLoading] = useState(true);

  // Theme Logic
  useEffect(() => {
    const savedTheme = localStorage.getItem("theme") || 
      (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
    setTheme(savedTheme);
  }, []);

  useEffect(() => {
    if (theme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
    localStorage.setItem("theme", theme);
  }, [theme]);

  // Data Logic
  useEffect(() => {
    fetch("/doctors.json")
      .then(res => res.json())
      .then(data => {
        setInstructors(data);
        setLoading(false);
      })
      .catch(err => {
        console.error("Failed to load instructors:", err);
        setLoading(false);
      });
  }, []);

  return (
    <html lang="en">
      <head>
        <title>MubxBot | HTU School of Computing</title>
        <meta name="description" content="Official Computing Directory for HTU School of Computing and Informatics." />
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="manifest" href="/site.webmanifest" />
        <meta name="theme-color" content={theme === "dark" ? "#000000" : "#ffffff"} />
      </head>
      <body className="antialiased">
        <DoctorsContext.Provider value={{ instructors, setInstructors, loading, theme, setTheme }}>
          {children}
        </DoctorsContext.Provider>
        <Analytics />
      </body>
    </html>
  );
}
