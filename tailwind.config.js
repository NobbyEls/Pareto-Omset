/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      fontFamily: {
        sans: [
          "Inter",
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "Segoe UI",
          "Roboto",
          "sans-serif",
        ],
        display: [
          "Space Grotesk",
          "Inter",
          "ui-sans-serif",
          "system-ui",
          "sans-serif",
        ],
        mono: [
          "Roboto Mono",
          "ui-monospace",
          "SFMono-Regular",
          "Menlo",
          "monospace",
        ],
      },
      colors: {
        // Match the omset palette so utilities like text-indigo-400 align with charts
        brand: {
          indigo: "#6366f1",
          purple: "#a855f7",
          pink: "#ec4899",
          rose: "#f43f5e",
          amber: "#f59e0b",
          emerald: "#10b981",
          cyan: "#06b6d4",
          blue: "#3b82f6",
          sky: "#0ea5e9",
        },
      },
      boxShadow: {
        card: "0 8px 32px rgba(0, 0, 0, 0.3)",
        elevated: "0 20px 60px rgba(0, 0, 0, 0.4)",
        glow: "0 0 60px rgba(99, 102, 241, 0.18)",
        "glow-pink": "0 0 60px rgba(236, 72, 153, 0.18)",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0", transform: "translateY(6px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        floatOrb: {
          "0%, 100%": { transform: "translate(0, 0) scale(1)" },
          "33%": { transform: "translate(40px, -30px) scale(1.05)" },
          "66%": { transform: "translate(-30px, 40px) scale(0.95)" },
        },
      },
      animation: {
        fadeIn: "fadeIn 0.4s ease-out both",
        floatOrb: "floatOrb 20s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};
