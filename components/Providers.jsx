"use client";

import React, { useState, useEffect, createContext, useContext } from "react";

const DoctorsContext = createContext();

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
    Promise.all([
      fetch("/api/doctors").then(res => res.json()),
      fetch("/office_hours.json").then(res => res.json()).catch(() => [])
    ])
      .then(([doctorsData, officeHoursData]) => {
        setInstructors(doctorsData);
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
