import { Download, Sun, Moon, Database, Settings2 } from "lucide-react";
import { useTheme } from "../lib/theme";
import { useState, type ReactNode } from "react";
import { getWebAppUrl, setWebAppUrl } from "../lib/dataset";

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

function WebAppConfig({ onClose }: { onClose: () => void }) {
  const [url, setUrl] = useState(getWebAppUrl() ?? "");

  const save = () => {
    setWebAppUrl(url || null);
    onClose();
    // Force reload so the new URL is used.
    setTimeout(() => window.location.reload(), 100);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }}
      onClick={onClose}
    >
      <div
        className="glass-card max-w-xl p-6"
        style={{ background: "var(--bg-card-hover)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <h3
          className="font-display mb-2 text-lg font-bold"
          style={{ color: "var(--text-primary)" }}
        >
          Setup Apps Script Web App URL
        </h3>
        <p className="mb-3 text-sm" style={{ color: "var(--text-muted)" }}>
          Tempelkan URL Web App dari Google Apps Script. Kalau dikosongkan,
          dashboard pakai CSV publik (lebih lambat &amp; bisa "Loading...").
        </p>
        <input
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://script.google.com/macros/s/.../exec"
          className="input mb-4 w-full"
          autoFocus
        />
        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="btn-glass">
            Batal
          </button>
          <button onClick={save} className="btn-glass" style={{ borderColor: "rgba(99,102,241,0.5)" }}>
            Simpan &amp; Reload
          </button>
        </div>
      </div>
    </div>
  );
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
  const [configOpen, setConfigOpen] = useState(false);
  const usingWebApp = !!getWebAppUrl();

  const statusLabel = (() => {
    if (refreshing && !loading) return "Sinkron...";
    if (loading) return "Memuat...";
    if (!fetchedAt) return "—";
    return `${fromCache ? "Cache" : "Fresh"}${isStale ? " · stale" : ""} • ${timeAgo(fetchedAt)}`;
  })();

  return (
    <>
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
                title={
                  usingWebApp
                    ? "Sumber: Apps Script Web App"
                    : "Sumber: CSV publik (klik gear untuk setup Web App)"
                }
              >
                <Database
                  className={`h-3 w-3 ${refreshing ? "animate-pulse" : ""}`}
                  style={{
                    color: usingWebApp
                      ? "#10b981"
                      : isStale
                        ? "#f59e0b"
                        : "var(--text-muted)",
                  }}
                />
                <span>{statusLabel}</span>
              </div>

              <button
                onClick={onUpdateData}
                disabled={refreshing}
                className="btn-glass"
                title="Ambil data terbaru dari Google Sheets (retry 6x kalau IMPORTRANGE belum siap)"
              >
                <Download
                  className={`h-4 w-4 ${refreshing ? "animate-bounce" : ""}`}
                />
                <span className="hidden sm:inline">
                  {refreshing ? "Memuat..." : "Update Data"}
                </span>
              </button>

              <button
                onClick={() => setConfigOpen(true)}
                className="btn-glass"
                title="Setup Apps Script Web App URL"
                aria-label="Setup Web App URL"
              >
                <Settings2 className="h-4 w-4" />
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

          {children && <div className="pb-3">{children}</div>}
        </div>
      </header>

      {configOpen && <WebAppConfig onClose={() => setConfigOpen(false)} />}
    </>
  );
}
