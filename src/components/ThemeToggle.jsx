
import React from "react";

export default function ThemeToggle({ theme, setTheme }) {
  return (
    <button
      aria-label="Toggle light and dark theme"
      className="rounded-full px-3 py-1 bg-gray-100 dark:bg-gray-700 text-xl transition"
      onClick={() => setTheme(theme === "light" ? "dark" : "light")}
    >
      {theme === "light" ? "🌞" : "🌙"}
    </button>
  );
}
