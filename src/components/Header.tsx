import {
  RefreshCw,
  Sun,
  Moon,
  Activity,
  ExternalLink,
} from "lucide-react";
import { useTheme } from "../lib/theme";

interface HeaderProps {
  loading: boolean;
  fetchedAt: Date | null;
  onRefresh: () => void;
  csvUrl: string;
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

export function Header({ loading, fetchedAt, onRefresh, csvUrl }: HeaderProps) {
  const { theme, toggle } = useTheme();

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200/70 bg-white/70 backdrop-blur-xl dark:border-white/5 dark:bg-[#0a0f1c]/70">
      <div className="mx-auto flex max-w-[1500px] flex-wrap items-center justify-between gap-3 px-4 py-3 md:px-8">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-2xl bg-gradient-to-br from-brand-500 to-sky-500 shadow-glow">
            <Activity className="h-5 w-5 text-white" />
          </div>
          <div className="leading-tight">
            <h1 className="text-base font-bold tracking-tight md:text-lg">
              Pareto Omset
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Sales Analytics Dashboard
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <a
            href={csvUrl}
            target="_blank"
            rel="noreferrer"
            className="btn hidden md:inline-flex"
            title="Buka sumber data (CSV publik)"
          >
            <ExternalLink className="h-4 w-4" />
            <span>Sumber</span>
          </a>

          {fetchedAt && (
            <div className="chip hidden sm:inline-flex">
              <span className="h-2 w-2 animate-pulse rounded-full bg-brand-500" />
              <span>Update {timeAgo(fetchedAt)}</span>
            </div>
          )}

          <button
            onClick={onRefresh}
            disabled={loading}
            className="btn"
            title="Muat ulang data"
          >
            <RefreshCw
              className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}
            />
            <span className="hidden sm:inline">Refresh</span>
          </button>

          <button
            onClick={toggle}
            className="btn"
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
