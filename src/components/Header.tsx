import { Download, Sun, Moon, Database } from "lucide-react";
import { useTheme } from "../lib/theme";
import type { ReactNode } from "react";

interface HeaderProps {
  loading: boolean;
  refreshing: boolean;
  fetchedAt: Date | null;
  fromCache: boolean;
  isStale: boolean;
  onUpdateData: () => void;
  children?: ReactNode;
}

function timeAgo(d: Date): string {
  const s = Math.floor((Date.now() - d.getTime()) / 1000);
  if (s < 5) return "baru saja";
  if (s < 60) return `${s} detik lalu`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m} menit lalu`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} jam lalu`;
  const d2 = Math.floor(h / 24);
  return `${d2} hari lalu`;
}

export function Header({
  loading,
  refreshing,
  fetchedAt,
  fromCache,
  isStale,
  onUpdateData,
  children,
}: HeaderProps) {
  const { theme, toggle } = useTheme();

  const statusLabel = (() => {
    if (refreshing && !loading) return "Sinkron...";
    if (loading) return "Memuat...";
    if (!fetchedAt) return "—";
    return `${fromCache ? "Cache" : "Fresh"}${isStale ? " · stale" : ""} • ${timeAgo(fetchedAt)}`;
  })();

  return (
    <header
      className="sticky top-0 z-30"
      style={{
        background: "transparent",
        borderBottom: "1px solid var(--border-subtle)",
        backdropFilter: "blur(16px)",
        WebkitBackdropFilter: "blur(16px)",
      }}
    >
      <div className="mx-auto max-w-[1500px] px-4 md:px-8">
        <div className="flex flex-wrap items-center justify-between gap-3 py-3">
          <div className="flex items-center gap-3">
            <div
              className="grid h-10 w-10 place-items-center rounded-2xl"
              style={{
                background:
                  "linear-gradient(135deg, #6366f1 0%, #ec4899 100%)",
                boxShadow: "0 0 25px rgba(99,102,241,0.4)",
              }}
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="white"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M3 3v18h18" />
                <path d="M7 16l4-8 4 4 6-12" />
              </svg>
            </div>
            <h1 className="brand-gradient text-base font-bold md:text-lg">
              Pareto Omset
            </h1>
          </div>

          <div className="flex items-center gap-2">
            <div
              className="chip hidden sm:inline-flex"
              title="Sumber data: Apps Script Web App"
            >
              <Database
                className={`h-3 w-3 ${refreshing ? "animate-pulse" : ""}`}
                style={{
                  color: isStale ? "#f59e0b" : "#10b981",
                }}
              />
              <span>{statusLabel}</span>
            </div>

            <button
              onClick={onUpdateData}
              disabled={refreshing}
              className="btn-glass"
              title="Ambil data terbaru dari Google Sheets"
            >
              <Download
                className={`h-4 w-4 ${refreshing ? "animate-bounce" : ""}`}
              />
              <span className="hidden sm:inline">
                {refreshing ? "Memuat..." : "Update Data"}
              </span>
            </button>

            <button
              onClick={toggle}
              className="btn-glass"
              title="Toggle tema"
              aria-label="Toggle theme"
            >
              {theme === "dark" ? (
                <Sun className="h-4 w-4" />
              ) : (
                <Moon className="h-4 w-4" />
              )}
            </button>
          </div>
        </div>

        {children && <div className="flex flex-col gap-3 pb-3">{children}</div>}
      </div>
    </header>
  );
}
