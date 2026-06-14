import { AlertTriangle, Database, Loader2 } from "lucide-react";

export function LoadingState() {
  return (
    <div className="glass-card flex flex-col items-center justify-center gap-3 p-12 text-center">
      <Loader2 className="h-8 w-8 animate-spin" style={{ color: "#6366f1" }} />
      <div>
        <div
          className="font-display font-semibold"
          style={{ color: "var(--text-primary)" }}
        >
          Memuat data dari Google Sheets…
        </div>
        <div className="text-xs" style={{ color: "var(--text-muted)" }}>
          Mengambil CSV terbaru dari spreadsheet publik.
        </div>
      </div>
    </div>
  );
}

export function ErrorState({ message }: { message: string }) {
  return (
    <div className="glass-card flex flex-col items-center justify-center gap-3 p-12 text-center">
      <div
        className="grid h-12 w-12 place-items-center rounded-2xl"
        style={{
          background: "rgba(244, 63, 94, 0.15)",
          color: "#fb7185",
        }}
      >
        <AlertTriangle className="h-6 w-6" />
      </div>
      <div>
        <div
          className="font-display font-semibold"
          style={{ color: "var(--text-primary)" }}
        >
          Gagal memuat data
        </div>
        <div className="text-xs" style={{ color: "var(--text-muted)" }}>
          {message}
        </div>
      </div>
    </div>
  );
}

export function EmptyState() {
  return (
    <div className="glass-card flex flex-col items-center justify-center gap-3 p-12 text-center">
      <div
        className="grid h-12 w-12 place-items-center rounded-2xl"
        style={{
          background: "var(--bg-glass)",
          color: "var(--text-muted)",
          border: "1px solid var(--border-medium)",
        }}
      >
        <Database className="h-6 w-6" />
      </div>
      <div>
        <div
          className="font-display font-semibold"
          style={{ color: "var(--text-primary)" }}
        >
          Belum ada data terbaca
        </div>
        <div className="text-xs" style={{ color: "var(--text-muted)" }}>
          Pastikan spreadsheet sudah dipublish ke web (File → Publish to web →
          Republish) dan kolom tahun (mis. 2024, 2025) ada di baris pertama.
        </div>
      </div>
    </div>
  );
}
