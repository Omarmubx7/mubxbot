"use client";

import React, { useState, useEffect, createContext, useContext } from "react";

const DoctorsContext = createContext();
const DOCTORS_CACHE_KEY = 'mubx_doctors_cache_v5';

function safeParseDoctorsCache(raw) {
  try {
    const parsed = JSON.parse(raw || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export const useDoctors = () => useContext(DoctorsContext);

export default function Providers({ children }) {
  const [theme, setTheme] = useState("light");
  const [instructors, setInstructors] = useState([]);
  const [officeHours, setOfficeHours] = useState([]);
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

  // Data Logic — server (DB) is always the source of truth on load.
  // Cache is used only for an instant first-render while the fetch is in flight.
  useEffect(() => {
    const cachedDoctors = safeParseDoctorsCache(localStorage.getItem(DOCTORS_CACHE_KEY));
    if (cachedDoctors.length > 0) {
      setInstructors(cachedDoctors); // optimistic render from cache
    }

    Promise.all([
      fetch("/api/doctors").then((res) => {
        if (!res.ok) throw new Error(`Directory request failed (${res.status})`);
        return res.json();
      }),
      fetch("/api/office-hours")
        .then((res) => (res.ok ? res.json() : []))
        .catch(() => [])
    ])
      .then(([doctorsData, officeHoursData]) => {
        // DB data wins — overwrite whatever was in the cache, no merge
        const serverDoctors = Array.isArray(doctorsData) ? doctorsData : [];
        setInstructors(serverDoctors);
        try {
          localStorage.setItem(DOCTORS_CACHE_KEY, JSON.stringify(serverDoctors));
        } catch (e) {
          console.warn('Storage write disabled', e);
        }
        setOfficeHours(Array.isArray(officeHoursData) ? officeHoursData : []);
        setLoading(false);
      })
      .catch(err => {
        // Keep whatever we rendered from cache instead of replacing it with [].
        console.error("Failed to load directory data:", err);
        setLoading(false);
      });
  }, []);

  // Presence heartbeat — tells the admin dashboard how many devices are online
  useEffect(() => {
    let sessionId = sessionStorage.getItem('mubx_session_id');
    if (!sessionId) {
      sessionId = crypto.randomUUID();
      sessionStorage.setItem('mubx_session_id', sessionId);
    }

    const sendHeartbeat = () => {
      fetch('/api/presence', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId }),
        keepalive: true
      }).catch(() => {});
    };

    sendHeartbeat();
    const interval = setInterval(sendHeartbeat, 60_000);
    return () => clearInterval(interval);
  }, []);

  return (
    <DoctorsContext.Provider value={{ instructors, setInstructors, officeHours, setOfficeHours, loading, theme, setTheme }}>
      {children}
    </DoctorsContext.Provider>
  );
}
