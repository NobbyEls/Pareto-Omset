import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// When deployed to GitHub Pages under https://<user>.github.io/Pareto-Omset/,
// assets must be served from "/Pareto-Omset/". For local dev we keep "/".
const isProd = process.env.NODE_ENV === "production";

export default defineConfig({
  plugins: [react()],
  base: isProd ? "/Pareto-Omset/" : "/",
  server: {
    port: 5173,
    host: true,
  },
});
