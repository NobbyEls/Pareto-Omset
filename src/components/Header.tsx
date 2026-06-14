import { RefreshCw, Sun, Moon } from "lucide-react";
import { useTheme } from "../lib/theme";

interface HeaderProps {
  loading: boolean;
  fetchedAt: Date | null;
  onRefresh: () => void;
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

export function Header({ loading, fetchedAt, onRefresh }: HeaderProps) {
  const { theme, toggle } = useTheme();

  return (
    <header
      className="sticky top-0 z-30 backdrop-blur-xl"
      style={{
        background:
          "linear-gradient(180deg, var(--bg-base) 60%, transparent 100%)",
        borderBottom: "1px solid var(--border-subtle)",
      }}
    >
      <div className="mx-auto flex max-w-[1500px] flex-wrap items-center justify-between gap-3 px-4 py-3 md:px-8">
        <div className="flex items-center gap-3">
          <div
            className="grid h-11 w-11 place-items-center rounded-2xl"
            style={{
              background:
                "linear-gradient(135deg, #6366f1 0%, #ec4899 100%)",
              boxShadow: "0 0 30px rgba(99,102,241,0.45)",
            }}
          >
            <svg
              width="22"
              height="22"
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
          <div className="leading-tight">
            <h1 className="brand-gradient text-base font-bold md:text-lg">
              Pareto Omset
            </h1>
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>
              Sales Analytics Dashboard
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {fetchedAt && (
            <div className="chip">
              <span
                className="h-2 w-2 animate-pulse rounded-full"
                style={{ background: "var(--emerald)" }}
              />
              <span>Update {timeAgo(fetchedAt)}</span>
            </div>
          )}

          <button
            onClick={onRefresh}
            disabled={loading}
            className="btn-glass"
            title="Muat ulang data"
          >
            <RefreshCw
              className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}
            />
            <span className="hidden sm:inline">Refresh</span>
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
    </header>
  );
}
