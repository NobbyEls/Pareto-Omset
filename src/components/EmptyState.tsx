import { AlertTriangle, Database, Loader2 } from "lucide-react";

export function LoadingState() {
  return (
    <div className="glass-card flex flex-col items-center justify-center gap-3 p-12 text-center">
      <Loader2 className="h-8 w-8 animate-spin text-brand-500" />
      <div>
        <div className="font-semibold">Memuat data dari Google Sheets…</div>
        <div className="text-xs text-slate-500 dark:text-slate-400">
          Mengambil CSV terbaru dari spreadsheet publik.
        </div>
      </div>
    </div>
  );
}

export function ErrorState({ message }: { message: string }) {
  return (
    <div className="glass-card flex flex-col items-center justify-center gap-3 p-12 text-center">
      <div className="grid h-12 w-12 place-items-center rounded-2xl bg-rose-500/10 text-rose-500">
        <AlertTriangle className="h-6 w-6" />
      </div>
      <div>
        <div className="font-semibold">Gagal memuat data</div>
        <div className="text-xs text-slate-500 dark:text-slate-400">
          {message}
        </div>
      </div>
    </div>
  );
}

export function EmptyState() {
  return (
    <div className="glass-card flex flex-col items-center justify-center gap-3 p-12 text-center">
      <div className="grid h-12 w-12 place-items-center rounded-2xl bg-slate-500/10 text-slate-500">
        <Database className="h-6 w-6" />
      </div>
      <div>
        <div className="font-semibold">Belum ada data terbaca</div>
        <div className="text-xs text-slate-500 dark:text-slate-400">
          Pastikan spreadsheet sudah dipublish ke web (File → Publish to web →
          Republish) dan kolom tahun (mis. 2024, 2025) ada di baris pertama.
        </div>
      </div>
    </div>
  );
}
