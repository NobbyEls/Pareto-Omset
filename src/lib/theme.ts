import { useEffect, useState } from "react";

const STORAGE_KEY = "pareto-theme";
type Theme = "light" | "dark";

function getInitialTheme(): Theme {
  if (typeof window === "undefined") return "dark";
  const stored = window.localStorage.getItem(STORAGE_KEY) as Theme | null;
  if (stored === "light" || stored === "dark") return stored;
  // Default to dark to match the premium glassmorphism look.
  return "dark";
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
 * Centralized chart color palette — aligns with the omset premium dark theme:
 * indigo / cyan / pink / amber for the four canonical buckets.
 */
export const CHART_COLORS = {
  NB: "#6366f1", // indigo — biggest bucket, headline color
  PC: "#06b6d4", // cyan
  JASA: "#ec4899", // pink
  "Grand Total": "#f59e0b", // amber, used for total accents
} as const;

export const YEAR_COLORS = [
  "#6366f1", // indigo
  "#ec4899", // pink
  "#10b981", // emerald
  "#f59e0b", // amber
  "#06b6d4", // cyan
  "#a855f7", // purple
  "#f43f5e", // rose
];
