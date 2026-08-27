"use client";

import { Moon, Sun } from "lucide-react";
import { useLayoutEffect, useState } from "react";

const STORAGE_KEY = "voxx-theme";

export function ThemeToggle() {
  const [theme, setTheme] = useState<"light" | "dark" | null>(null);

  useLayoutEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === "dark" || stored === "light") {
      document.documentElement.classList.add(stored);
      setTheme(stored);
    } else {
      const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      const initial = prefersDark ? "dark" : "light";
      document.documentElement.classList.add(initial);
      setTheme(initial);
    }
  }, []);

  const toggle = () => {
    const root = document.documentElement;
    const next = theme === "dark" ? "light" : "dark";
    root.classList.remove("dark", "light");
    root.classList.add(next);
    localStorage.setItem(STORAGE_KEY, next);
    setTheme(next);
  };

  return (
    <button
      type="button"
      className="voxx-icon-button voxx-theme-toggle"
      aria-label="Toggle theme"
      onClick={toggle}
    >
      {theme === "dark" ? (
        <Sun className="voxx-icon-sun" aria-hidden="true" />
      ) : (
        <Moon className="voxx-icon-moon" aria-hidden="true" />
      )}
    </button>
  );
}
