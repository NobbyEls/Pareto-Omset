import { useEffect, useState } from "react";

const STORAGE_KEY = "pareto-theme";
type Theme = "light" | "dark";

function getInitialTheme(): Theme {
  if (typeof window === "undefined") return "dark";
  const stored = window.localStorage.getItem(STORAGE_KEY) as Theme | null;
  if (stored === "light" || stored === "dark") return stored;
  return window.matchMedia("(prefers-color-scheme: light)").matches
    ? "light"
    : "dark";
}

export function useTheme() {
  const [theme, setTheme] = useState<Theme>(getInitialTheme);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle("dark", theme === "dark");
    window.localStorage.setItem(STORAGE_KEY, theme);
  }, [theme]);

  const toggle = () => setTheme((t) => (t === "dark" ? "light" : "dark"));
  return { theme, setTheme, toggle };
}

/**
 * Centralized chart color palette so every chart agrees on a department's hue.
 */
export const CHART_COLORS = {
  NB: "#28b955",
  PC: "#0ea5e9",
  "JASA SERVICE": "#a855f7",
  JASA: "#f59e0b",
  "Grand Total": "#94a3b8",
} as const;

export const YEAR_COLORS = [
  "#28b955",
  "#0ea5e9",
  "#f59e0b",
  "#a855f7",
  "#ef4444",
  "#10b981",
  "#6366f1",
];
