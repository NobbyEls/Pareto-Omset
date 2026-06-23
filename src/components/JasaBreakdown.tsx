import { useMemo } from "react";
import { MapPin, Wrench, TrendingUp } from "lucide-react";
import {
  type JasaDatasetState,
  aggregateJasaRecords,
  KOTA_CODE_TO_NAME,
} from "../lib/jasaDataset";
import { formatIDR } from "../lib/format";
import { SectionCard } from "./SectionCard";
import type { DeptFilter, KotaFilter, YearFilter } from "./Filters";
import { KOTA_NAMES } from "../lib/csvParser";

interface JasaBreakdownProps {
  jasaState: JasaDatasetState;
  selectedYear: YearFilter;
  selectedKota: KotaFilter;
  selectedDept: DeptFilter;
}

/**
 * Year used as the implicit baseline for "Jasa Part" and "Jasa Service".
 * The breakdown CSV doesn't carry a year column, so we treat its rows as
 * belonging to this year. When the user filters to a different year, those
 * two categories are dropped (only "Jasa Sales" — which DOES have a year —
 * remains).
 */
const PART_SERVICE_BASELINE_YEAR = 2026;

/* ─── Color palette for Jasa ──────────────────────────── */
// Used for chart bar fills (Recharts) AND icon-square backgrounds — both
// scenarios need a saturated raw-hex value (CSS vars don't propagate into
// Recharts SVG attributes).
const JASA_PART_COLOR = "#f59e0b"; // amber
const JASA_SERVICE_COLOR = "#6366f1"; // indigo
const JASA_SALES_COLOR = "#10b981"; // emerald

// Theme-adaptive text variants. KPI card big numbers and table cell values
// use these so light mode stays legible (darker shades on a near-white bg).
const JASA_PART_TEXT = "var(--jasa-part-text)";
const JASA_SERVICE_TEXT = "var(--jasa-service-text)";
const JASA_SALES_TEXT = "var(--jasa-sales-text)";

const KOTA_GRADIENTS: Record<string, string> = {
  YOGYAKARTA: "linear-gradient(135deg, #6366f1, #ec4899)",
  SOLO: "linear-gradient(135deg, #06b6d4, #6366f1)",
  SEMARANG: "linear-gradient(135deg, #3b82f6, #8b5cf6)",
  PURWOKERTO: "linear-gradient(135deg, #f59e0b, #ec4899)",
  BABARSARI: "linear-gradient(135deg, #a855f7, #06b6d4)",
  TEGAL: "linear-gradient(135deg, #10b981, #84cc16)",
  MADIUN: "linear-gradient(135deg, #f43f5e, #f59e0b)",
};

/* ─── Table Row Component ────────────────────────────── */
function KotaRow({
  cabang,
  jasaPart,
  jasaService,
  jasaSales,
  total,
  share,
  maxShare,
  showPart,
  showService,
}: {
  cabang: string;
  jasaPart: number;
  jasaService: number;
  jasaSales: number;
  total: number;
  share: number;
  maxShare: number;
  showPart: boolean;
  showService: boolean;
}) {
  const gradient = KOTA_GRADIENTS[cabang] || "linear-gradient(135deg, #6366f1, #06b6d4)";
  const barWidth = maxShare > 0 ? (share / maxShare) * 100 : 0;
  const servicePct = total > 0 ? ((jasaService / total) * 100).toFixed(1) : "0.0";
  const partPct = total > 0 ? ((jasaPart / total) * 100).toFixed(1) : "0.0";
  const salesPct = total > 0 ? ((jasaSales / total) * 100).toFixed(1) : "0.0";

  return (
    <tr style={{ borderBottom: "1px solid var(--border-subtle)" }}>
      <td className="px-3 py-3">
        <div className="flex items-center gap-2.5">
          <div
            className="grid h-9 w-9 place-items-center rounded-xl text-white"
            style={{ background: gradient, boxShadow: "0 0 16px rgba(99,102,241,0.25)" }}
          >
            <MapPin className="h-4 w-4" />
          </div>
          <div
            className="font-display text-sm font-semibold"
            style={{ color: "var(--text-primary)" }}
          >
            {cabang}
          </div>
        </div>
      </td>
      {/* Order: Sales → Service → Part — emphasises revenue first. */}
      <td className="px-3 py-3 text-right font-mono tabular-nums" style={{ color: JASA_SALES_TEXT }}>
        {formatIDR(jasaSales)}
        <span className="ml-1 text-[10px]" style={{ color: "var(--text-dim)" }}>
          ({salesPct}%)
        </span>
      </td>
      {showService && (
        <td
          className="px-3 py-3 text-right font-mono tabular-nums"
          style={{ color: JASA_SERVICE_TEXT }}
        >
          {formatIDR(jasaService)}
          <span className="ml-1 text-[10px]" style={{ color: "var(--text-dim)" }}>
            ({servicePct}%)
          </span>
        </td>
      )}
      {showPart && (
        <td
          className="px-3 py-3 text-right font-mono tabular-nums"
          style={{ color: JASA_PART_TEXT }}
        >
          {formatIDR(jasaPart)}
          <span className="ml-1 text-[10px]" style={{ color: "var(--text-dim)" }}>
            ({partPct}%)
          </span>
        </td>
      )}
      <td className="px-3 py-3 text-right font-mono font-semibold tabular-nums" style={{ color: "var(--text-primary)" }}>
        {formatIDR(total)}
      </td>
      <td className="px-3 py-3 text-right">
        <div className="flex flex-col items-end gap-1">
          <span className="font-mono font-semibold tabular-nums" style={{ color: "var(--tint-share)" }}>
            {share.toFixed(1)}%
          </span>
          <div className="h-1.5 w-24 rounded-full" style={{ background: "rgba(255,255,255,0.06)" }}>
            <div
              className="h-full rounded-full"
              style={{ width: `${Math.min(100, barWidth)}%`, background: gradient }}
            />
          </div>
        </div>
      </td>
    </tr>
  );
}

/* ─── Main Component ─────────────────────────────────── */
export function JasaBreakdown({
  jasaState,
  selectedYear,
  selectedKota,
  selectedDept,
}: JasaBreakdownProps) {
  // Use the Jasa dataset state passed from App (lifted to ensure setDataDate()
  // is called before estimation-dependent components render).
  const { data: rawData, loading, error } = jasaState;

  // Should we keep Jasa Part / Jasa Service rows for the active year filter?
  // They have no year field, so we treat them as belonging to PART_SERVICE_BASELINE_YEAR.
  const includePartService =
    selectedYear === "all" || selectedYear === PART_SERVICE_BASELINE_YEAR;

  // Re-aggregate from raw records using current filters.
  const filtered = useMemo(() => {
    if (!rawData) return null;

    const targetCabang =
      selectedKota === "all" ? null : KOTA_CODE_TO_NAME[selectedKota];

    const filteredRecords = includePartService
      ? rawData.records.filter(
          (r) => !targetCabang || r.cabang === targetCabang
        )
      : [];

    const filteredSales = rawData.jasaSalesRecords.filter((r) => {
      if (targetCabang && r.cabang !== targetCabang) return false;
      if (selectedYear !== "all" && r.year !== selectedYear) return false;
      return true;
    });

    const agg = aggregateJasaRecords(filteredRecords, filteredSales);
    return { ...agg, hasAny: filteredRecords.length + filteredSales.length > 0 };
  }, [rawData, selectedYear, selectedKota, includePartService]);

  // Hide section entirely when the dept filter excludes JASA.
  if (selectedDept !== "all" && selectedDept !== "JASA") {
    return null;
  }

  // Build human-readable filter context for titles.
  const yearLabel = selectedYear === "all" ? "Semua Tahun" : String(selectedYear);
  const kotaLabel =
    selectedKota === "all" ? "Semua Kota" : KOTA_NAMES[selectedKota];

  if (loading) {
    return (
      <SectionCard
        title="Breakdown Departemen Jasa"
        description="Memuat data..."
        tag={{ label: "Jasa", tone: "amber" }}
      >
        <div className="flex h-48 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-indigo-400 border-t-transparent" />
        </div>
      </SectionCard>
    );
  }

  if (error || !rawData || rawData.records.length === 0) {
    return (
      <SectionCard
        title="Breakdown Departemen Jasa"
        description="Gagal memuat data jasa"
        tag={{ label: "Jasa", tone: "amber" }}
      >
        <div
          className="flex h-32 items-center justify-center text-sm"
          style={{ color: "var(--text-dim)" }}
        >
          {error || "Data tidak tersedia"}
        </div>
      </SectionCard>
    );
  }

  // After loading + raw guards, filtered must be non-null — but TS doesn't
  // know that, so guard explicitly.
  if (!filtered || !filtered.hasAny) {
    return (
      <SectionCard
        title={`Breakdown Departemen Jasa • ${kotaLabel} • ${yearLabel}`}
        description="Tidak ada data Jasa untuk kombinasi filter ini."
        tag={{ label: "Jasa", tone: "amber" }}
      >
        <div
          className="flex h-32 items-center justify-center text-sm"
          style={{ color: "var(--text-dim)" }}
        >
          Tidak ada data Jasa untuk filter saat ini.
        </div>
      </SectionCard>
    );
  }

  const maxShare = Math.max(...filtered.byKota.map((k) => k.share), 1);
  const totalPart = filtered.byKota.reduce((s, k) => s + k.jasaPart, 0);
  const totalService = filtered.byKota.reduce((s, k) => s + k.jasaService, 0);
  const totalSales = filtered.byKota.reduce((s, k) => s + k.jasaSales, 0);
  const partPctGlobal =
    filtered.grandTotal > 0
      ? ((totalPart / filtered.grandTotal) * 100).toFixed(1)
      : "0";
  const servicePctGlobal =
    filtered.grandTotal > 0
      ? ((totalService / filtered.grandTotal) * 100).toFixed(1)
      : "0";
  const salesPctGlobal =
    filtered.grandTotal > 0
      ? ((totalSales / filtered.grandTotal) * 100).toFixed(1)
      : "0";

  // Decide which Part/Service columns/cards to show. When the year filter
  // excludes them entirely we skip them; otherwise we show whatever was
  // aggregated (possibly zero if no records matched the kota filter).
  const showPart = includePartService;
  const showService = includePartService;

  // Number of cards to show in the KPI grid (max 4: total + part + service + sales).
  const visibleKpis = 1 + (showPart ? 1 : 0) + (showService ? 1 : 0) + 1;

  return (
    <div className="space-y-5">
      {/* KPI summary cards — order: Total → Sales → Service → Part. */}
      <div
        className={`grid grid-cols-1 gap-3 sm:grid-cols-2 ${
          visibleKpis >= 4 ? "lg:grid-cols-4" : "lg:grid-cols-3"
        }`}
      >
        <div className="glass-card flex items-center gap-3 p-4">
          <div
            className="grid h-10 w-10 place-items-center rounded-xl"
            style={{ background: "linear-gradient(135deg, #6366f1, #ec4899)" }}
          >
            <Wrench className="h-5 w-5 text-white" />
          </div>
          <div className="min-w-0">
            <div className="text-xs" style={{ color: "var(--text-dim)" }}>
              Total Jasa • {yearLabel}
            </div>
            <div
              className="font-mono text-lg font-bold"
              style={{ color: "var(--text-primary)" }}
            >
              {formatIDR(filtered.grandTotal)}
            </div>
          </div>
        </div>
        <div className="glass-card flex items-center gap-3 p-4">
          <div
            className="grid h-10 w-10 place-items-center rounded-xl"
            style={{ background: JASA_SALES_COLOR }}
          >
            <TrendingUp className="h-5 w-5 text-white" />
          </div>
          <div className="min-w-0">
            <div className="text-xs" style={{ color: "var(--text-dim)" }}>
              Jasa Sales
            </div>
            <div
              className="font-mono text-lg font-bold"
              style={{ color: JASA_SALES_TEXT }}
            >
              {formatIDR(totalSales)}
              <span
                className="ml-1 text-xs font-normal"
                style={{ color: "var(--text-muted)" }}
              >
                ({salesPctGlobal}%)
              </span>
            </div>
          </div>
        </div>
        {showService && (
          <div className="glass-card flex items-center gap-3 p-4">
            <div
              className="grid h-10 w-10 place-items-center rounded-xl"
              style={{ background: JASA_SERVICE_COLOR }}
            >
              <TrendingUp className="h-5 w-5 text-white" />
            </div>
            <div className="min-w-0">
              <div className="text-xs" style={{ color: "var(--text-dim)" }}>
                Jasa Service
              </div>
              <div
                className="font-mono text-lg font-bold"
                style={{ color: JASA_SERVICE_TEXT }}
              >
                {formatIDR(totalService)}
                <span
                  className="ml-1 text-xs font-normal"
                  style={{ color: "var(--text-muted)" }}
                >
                  ({servicePctGlobal}%)
                </span>
              </div>
            </div>
          </div>
        )}
        {showPart && (
          <div className="glass-card flex items-center gap-3 p-4">
            <div
              className="grid h-10 w-10 place-items-center rounded-xl"
              style={{ background: JASA_PART_COLOR }}
            >
              <TrendingUp className="h-5 w-5 text-white" />
            </div>
            <div className="min-w-0">
              <div className="text-xs" style={{ color: "var(--text-dim)" }}>
                Jasa Part
              </div>
              <div
                className="font-mono text-lg font-bold"
                style={{ color: JASA_PART_TEXT }}
              >
                {formatIDR(totalPart)}
                <span
                  className="ml-1 text-xs font-normal"
                  style={{ color: "var(--text-muted)" }}
                >
                  ({partPctGlobal}%)
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Table breakdown per kota */}
      <SectionCard
        title={`Breakdown per Kota • ${kotaLabel} • ${yearLabel}`}
        description="Detail kontribusi Jasa Sales, Jasa Service, dan Jasa Part per cabang"
        tag={{ label: "Jasa - Kota", tone: "pink" }}
      >
        <div className="overflow-x-auto rounded-xl">
          <table
            className="w-full min-w-[800px] text-sm"
            style={{
              borderCollapse: "separate",
              borderSpacing: 0,
              borderRadius: 12,
              overflow: "hidden",
            }}
          >
            <thead>
              <tr>
                {(
                  [
                    "Kota",
                    "Jasa Sales",
                    ...(showService ? ["Jasa Service"] : []),
                    ...(showPart ? ["Jasa Part"] : []),
                    "Total",
                    "% Share",
                  ] as string[]
                ).map((col, i) => (
                  <th
                    key={col}
                    className={`px-3 py-2.5 text-xs font-bold uppercase tracking-wider ${
                      i === 0 ? "text-left" : "text-right"
                    }`}
                    style={{
                      color: "var(--text-dim)",
                      background: "rgba(99, 102, 241, 0.08)",
                      borderBottom: "1px solid var(--border-subtle)",
                    }}
                  >
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.byKota.map((row) => (
                <KotaRow
                  key={row.cabang}
                  cabang={row.cabang}
                  jasaPart={row.jasaPart}
                  jasaService={row.jasaService}
                  jasaSales={row.jasaSales}
                  total={row.total}
                  share={row.share}
                  maxShare={maxShare}
                  showPart={showPart}
                  showService={showService}
                />
              ))}
              {/* Grand total row — same column order as KotaRow above. */}
              <tr style={{ background: "rgba(99, 102, 241, 0.12)" }}>
                <td
                  className="font-display px-3 py-3 text-left font-bold"
                  style={{ color: "var(--text-primary)" }}
                >
                  Grand Total
                </td>
                <td
                  className="px-3 py-3 text-right font-mono font-bold tabular-nums"
                  style={{ color: JASA_SALES_TEXT }}
                >
                  {formatIDR(totalSales)}
                </td>
                {showService && (
                  <td
                    className="px-3 py-3 text-right font-mono font-bold tabular-nums"
                    style={{ color: JASA_SERVICE_TEXT }}
                  >
                    {formatIDR(totalService)}
                  </td>
                )}
                {showPart && (
                  <td
                    className="px-3 py-3 text-right font-mono font-bold tabular-nums"
                    style={{ color: JASA_PART_TEXT }}
                  >
                    {formatIDR(totalPart)}
                  </td>
                )}
                <td
                  className="px-3 py-3 text-right font-mono font-bold tabular-nums"
                  style={{ color: "var(--tint-share)" }}
                >
                  {formatIDR(filtered.grandTotal)}
                </td>
                <td
                  className="px-3 py-3 text-right font-mono tabular-nums"
                  style={{ color: "var(--text-muted)" }}
                >
                  100,0%
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </SectionCard>
    </div>
  );
}
