"use client";

import React, { useState, useEffect, createContext, useContext } from "react";

const DoctorsContext = createContext();
const DOCTORS_CACHE_KEY = 'mubx_doctors_cache_v1';

function safeParseDoctorsCache(raw) {
  try {
    const parsed = JSON.parse(raw || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function normalizeName(value = '') {
  return String(value || '').trim().toLowerCase();
}

function mergeDoctors(serverDoctors, cachedDoctors) {
  const map = new Map();

  for (const doctor of serverDoctors || []) {
    map.set(normalizeName(doctor?.name), doctor);
  }

  // Cached entries override server entries with same name.
  for (const doctor of cachedDoctors || []) {
    map.set(normalizeName(doctor?.name), doctor);
  }

  return Array.from(map.values()).filter(doctor => doctor?.name);
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

  // Data Logic
  useEffect(() => {
    const cachedDoctors = safeParseDoctorsCache(localStorage.getItem(DOCTORS_CACHE_KEY));
    if (cachedDoctors.length > 0) {
      setInstructors(cachedDoctors);
    }

    Promise.all([
      fetch("/api/doctors").then(res => res.json()),
      fetch("/office_hours.json").then(res => res.json()).catch(() => [])
    ])
      .then(([doctorsData, officeHoursData]) => {
        const mergedDoctors = mergeDoctors(doctorsData, cachedDoctors);
        setInstructors(mergedDoctors);
        localStorage.setItem(DOCTORS_CACHE_KEY, JSON.stringify(mergedDoctors));
        setOfficeHours(officeHoursData || []);
        setLoading(false);
      })
      .catch(err => {
        console.error("Failed to load data:", err);
        setLoading(false);
      });
  }, []);

  return (
    <DoctorsContext.Provider value={{ instructors, setInstructors, officeHours, setOfficeHours, loading, theme, setTheme }}>
      {children}
    </DoctorsContext.Provider>
  );
}
