import { useEffect, useMemo, useState } from "react";
import {
  ArrowUpDown,
  CalendarDays,
  Crown,
  MapPin,
  TrendingDown,
  TrendingUp,
  Wallet,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  DEPARTMENTS,
  KOTA_NAMES,
  type Department,
  type KotaCode,
  type ParsedDataset,
} from "../lib/csvParser";
import {
  classNames,
  formatIDR,
  formatIDRCompact,
  formatPercent,
  MONTHS_ID,
} from "../lib/format";
import { CHART_COLORS } from "../lib/theme";
import { SectionCard } from "./SectionCard";
import { ChartTooltip } from "./charts/ChartTooltip";
import type { DeptFilter, KotaFilter } from "./Filters";

/* ─── Per-kota gradient palette (mirrors KotaBreakdown) ─────────────── */
const KOTA_TINT: Record<KotaCode, string> = {
  "G-YGY": "linear-gradient(135deg, #6366f1, #ec4899)",
  "G-SLO": "linear-gradient(135deg, #06b6d4, #6366f1)",
  "G-PWT": "linear-gradient(135deg, #f59e0b, #ec4899)",
  "G-BBS": "linear-gradient(135deg, #a855f7, #06b6d4)",
  "G-TGL": "linear-gradient(135deg, #10b981, #84cc16)",
  "G-MDN": "linear-gradient(135deg, #f43f5e, #f59e0b)",
  "G-SMG": "linear-gradient(135deg, #3b82f6, #8b5cf6)",
};

interface Props {
  data: ParsedDataset;
  /** Resolved year (already collapsed from "Semua Tahun" → latest year). */
  year: number;
  selectedKota: KotaFilter;
  selectedDept: DeptFilter;
  visibleDepartments: Department[];
}

/* ─── Small util helpers ───────────────────────────────────────────── */
function pct(cur: number | null, prev: number | null): number | null {
  if (cur == null || prev == null || prev <= 0) return null;
  return ((cur - prev) / prev) * 100;
}

function formatPctID(n: number | null): string {
  if (n == null || !Number.isFinite(n)) return "—";
  const sign = n < 0 ? "-" : "";
  return `${sign}${Math.abs(n).toFixed(2).replace(".", ",")}%`;
}

function PctBadge({ value }: { value: number | null }) {
  if (value == null) return <span style={{ color: "var(--text-dim)" }}>—</span>;
  const positive = value >= 0;
  return (
    <span
      className="font-mono font-semibold tabular-nums"
      style={{ color: positive ? "var(--trend-up)" : "var(--trend-down)" }}
    >
      {formatPctID(value)}
    </span>
  );
}

/* ─── Sort plumbing ────────────────────────────────────────────────── */
type SortKey =
  | "name"
  | "NB"
  | "PC"
  | "JASA"
  | "total"
  | "share"
  | "mom"
  | "yoy";

/* ─── KPI tile — matches KpiCards visual language ──────────────────── */
function KpiTile({
  icon,
  label,
  value,
  sublabel,
  trend,
  gradient,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sublabel?: string;
  trend?: number | null;
  gradient: string;
}) {
  const trendUp = trend != null && trend >= 0;
  return (
    <div className="kpi-card animate-fadeIn">
      <div className="flex items-center justify-between">
        <span
          className="text-xs font-medium uppercase tracking-wider"
          style={{ color: "var(--text-dim)" }}
        >
          {label}
        </span>
        <div
          className="grid h-10 w-10 place-items-center rounded-xl text-white"
          style={{
            background: gradient,
            boxShadow: "0 0 25px rgba(99,102,241,0.25)",
          }}
        >
          {icon}
        </div>
      </div>
      <div
        className="mt-3 font-display text-2xl font-bold tracking-tight md:text-[28px]"
        style={{ color: "var(--text-primary)" }}
      >
        {value}
      </div>
      <div
        className="mt-1 flex flex-wrap items-center gap-2 text-xs"
        style={{ color: "var(--text-muted)" }}
      >
        {trend != null && (
          <span
            className="inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 font-semibold"
            style={{
              background: trendUp
                ? "rgba(16, 185, 129, 0.15)"
                : "rgba(244, 63, 94, 0.15)",
              color: trendUp ? "var(--trend-up)" : "var(--trend-down)",
              border: `1px solid ${
                trendUp ? "rgba(16, 185, 129, 0.3)" : "rgba(244, 63, 94, 0.3)"
              }`,
            }}
          >
            {trendUp ? (
              <TrendingUp className="h-3 w-3" />
            ) : (
              <TrendingDown className="h-3 w-3" />
            )}
            {formatPercent(trend)}
          </span>
        )}
        {sublabel && <span className="truncate">{sublabel}</span>}
      </div>
    </div>
  );
}

/* ─── Main component ──────────────────────────────────────────────── */
export function MonthlyAnalysis({
  data,
  year,
  selectedKota,
  selectedDept,
  visibleDepartments,
}: Props) {
  // Cities to render in the table (after global kota filter).
  const visibleKotas: KotaCode[] = useMemo(
    () => (selectedKota === "all" ? data.kotas : [selectedKota]),
    [data.kotas, selectedKota]
  );

  // Sum of `depts` at (year, monthIdx, kota); null when no values exist.
  const cellValue = (
    y: number,
    monthIdx: number,
    k: KotaCode,
    depts: Department[] = visibleDepartments
  ): number | null => {
    const cell = data.pivotKota[y]?.[monthIdx]?.[k];
    if (!cell) return null;
    let sum = 0;
    let any = false;
    for (const d of depts) {
      const v = cell[d];
      if (typeof v === "number") {
        sum += v;
        any = true;
      }
    }
    return any ? sum : null;
  };

  // Months of `year` that have at least one matching value across visible kotas.
  const availableMonths = useMemo(() => {
    const months: number[] = [];
    for (let m = 0; m < 12; m++) {
      for (const k of visibleKotas) {
        if (cellValue(year, m, k) != null) {
          months.push(m);
          break;
        }
      }
    }
    return months;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [year, visibleKotas, visibleDepartments, data]);

  const [selectedMonth, setSelectedMonth] = useState<number>(() =>
    availableMonths.length > 0 ? availableMonths[availableMonths.length - 1] : 0
  );

  // Snap `selectedMonth` back into `availableMonths` whenever filters change.
  useEffect(() => {
    if (availableMonths.length === 0) return;
    if (!availableMonths.includes(selectedMonth)) {
      setSelectedMonth(availableMonths[availableMonths.length - 1]);
    }
  }, [availableMonths, selectedMonth]);

  const [sortKey, setSortKey] = useState<SortKey>("total");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const onSort = (k: SortKey) => {
    if (k === sortKey) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(k);
      setSortDir("desc");
    }
  };

  // Reference period for MoM (Jan rolls over to Dec of prev year).
  const prev = useMemo(
    () =>
      selectedMonth === 0
        ? { y: year - 1, m: 11 }
        : { y: year, m: selectedMonth - 1 },
    [selectedMonth, year]
  );
  const hasPrev = useMemo(
    () => data.years.includes(prev.y),
    [data.years, prev.y]
  );
  const hasPrevYear = data.years.includes(year - 1);

  /* ─── Per-kota row computation ─── */
  interface Row {
    kota: KotaCode;
    name: string;
    NB: number;
    PC: number;
    JASA: number;
    total: number;
    share: number;
    mom: number | null;
    yoy: number | null;
  }

  const rows: Row[] = useMemo(() => {
    const results: Row[] = visibleKotas.map((k) => {
      const cell = data.pivotKota[year]?.[selectedMonth]?.[k];
      const NB = typeof cell?.NB === "number" ? cell.NB : 0;
      const PC = typeof cell?.PC === "number" ? cell.PC : 0;
      const JASA = typeof cell?.JASA === "number" ? cell.JASA : 0;
      const total = cellValue(year, selectedMonth, k) ?? 0;
      const prevVal = hasPrev ? cellValue(prev.y, prev.m, k) : null;
      const yoyPrev = hasPrevYear
        ? cellValue(year - 1, selectedMonth, k)
        : null;
      return {
        kota: k,
        name: KOTA_NAMES[k],
        NB,
        PC,
        JASA,
        total,
        share: 0,
        mom: pct(total, prevVal),
        yoy: pct(total, yoyPrev),
      };
    });
    const grand = results.reduce((s, r) => s + r.total, 0);
    for (const r of results) r.share = grand > 0 ? (r.total / grand) * 100 : 0;
    return results;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    year,
    selectedMonth,
    visibleKotas,
    visibleDepartments,
    hasPrev,
    hasPrevYear,
    prev.y,
    prev.m,
    data,
  ]);

  const sortedRows = useMemo(() => {
    const list = [...rows];
    list.sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];
      const an = typeof av === "number" ? av : av == null ? -Infinity : av;
      const bn = typeof bv === "number" ? bv : bv == null ? -Infinity : bv;
      let cmp: number;
      if (typeof an === "string" && typeof bn === "string") {
        cmp = an.localeCompare(bn);
      } else {
        const na = an as number;
        const nb = bn as number;
        cmp = na === nb ? 0 : na > nb ? 1 : -1;
      }
      return sortDir === "asc" ? cmp : -cmp;
    });
    return list;
  }, [rows, sortKey, sortDir]);

  /* ─── Cross-kota aggregates for KPIs ─── */
  const monthTotal = useMemo(
    () => rows.reduce((s, r) => s + r.total, 0),
    [rows]
  );

  const prevMonthTotal = useMemo(() => {
    if (!hasPrev) return null;
    let sum = 0;
    let any = false;
    for (const k of visibleKotas) {
      const v = cellValue(prev.y, prev.m, k);
      if (v != null) {
        sum += v;
        any = true;
      }
    }
    return any ? sum : null;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visibleKotas, prev.y, prev.m, visibleDepartments, hasPrev, data]);

  const monthMoM = pct(monthTotal, prevMonthTotal);

  const yoyMonthTotal = useMemo(() => {
    if (!hasPrevYear) return null;
    let sum = 0;
    let any = false;
    for (const k of visibleKotas) {
      const v = cellValue(year - 1, selectedMonth, k);
      if (v != null) {
        sum += v;
        any = true;
      }
    }
    return any ? sum : null;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    visibleKotas,
    year,
    selectedMonth,
    visibleDepartments,
    hasPrevYear,
    data,
  ]);

  const monthYoY = pct(monthTotal, yoyMonthTotal);

  // Top dept across visible kotas.
  const deptTotals = useMemo(() => {
    const t: Record<Department, number> = { NB: 0, PC: 0, JASA: 0 };
    for (const k of visibleKotas) {
      for (const d of DEPARTMENTS) {
        const v = data.pivotKota[year]?.[selectedMonth]?.[k]?.[d];
        if (typeof v === "number") t[d] += v;
      }
    }
    return t;
  }, [visibleKotas, year, selectedMonth, data]);

  const visibleDeptTotal = visibleDepartments.reduce(
    (s, d) => s + deptTotals[d],
    0
  );
  let topDept: Department = visibleDepartments[0] ?? "NB";
  for (const d of visibleDepartments) {
    if (deptTotals[d] > deptTotals[topDept]) topDept = d;
  }
  const topDeptShare =
    visibleDeptTotal > 0
      ? (deptTotals[topDept] / visibleDeptTotal) * 100
      : 0;

  // Top kota — pick the highest in `rows`.
  const topKotaRow = useMemo(
    () => [...rows].sort((a, b) => b.total - a.total)[0],
    [rows]
  );

  /* ─── Chart datasets ─── */
  const stackedRows = useMemo(
    () =>
      sortedRows.map((r) => {
        const out: Record<string, number | string> = {
          name: r.name,
          kota: r.kota,
        };
        for (const d of visibleDepartments) out[d] = r[d];
        return out;
      }),
    [sortedRows, visibleDepartments]
  );

  /* ─── Labels & visibility flags for table columns ─── */
  const monthLabel = MONTHS_ID[selectedMonth] ?? "—";
  const prevMonthLabel = MONTHS_ID[prev.m] ?? "—";
  const prevPeriodLabel = `${prevMonthLabel} ${prev.y}`;
  const showNB = visibleDepartments.includes("NB");
  const showPC = visibleDepartments.includes("PC");
  const showJASA = visibleDepartments.includes("JASA");

  const kotaFilterLabel =
    selectedKota === "all" ? "Semua Kota" : KOTA_NAMES[selectedKota];
  const deptFilterLabel =
    selectedDept === "all" ? "Semua Departemen" : selectedDept;

  /* ─── Empty state when the resolved year has zero matching data ─── */
  if (availableMonths.length === 0) {
    return (
      <SectionCard
        title={`Analisa Bulanan ${year}`}
        description={`Tidak ada data untuk filter saat ini (${kotaFilterLabel} • ${deptFilterLabel}).`}
        tag={{ label: "Bulanan", tone: "purple" }}
      >
        <div
          className="flex h-32 items-center justify-center text-sm"
          style={{ color: "var(--text-dim)" }}
        >
          Coba pilih tahun lain atau ubah filter.
        </div>
      </SectionCard>
    );
  }

  /* ───────── Header (sortable) ───────── */
  const Th = ({
    k,
    label,
    align = "right",
  }: {
    k: SortKey;
    label: string;
    align?: "left" | "right";
  }) => (
    <th
      onClick={() => onSort(k)}
      className={classNames(
        "cursor-pointer select-none px-3 py-2.5 text-xs font-bold uppercase tracking-wider transition",
        align === "right" ? "text-right" : "text-left"
      )}
      style={{
        color: sortKey === k ? "var(--tint-year-header)" : "var(--text-dim)",
        background: "rgba(99, 102, 241, 0.08)",
        borderBottom: "1px solid var(--border-subtle)",
      }}
    >
      <span
        className={classNames(
          "inline-flex items-center gap-1",
          align === "right" && "flex-row-reverse"
        )}
      >
        {label}
        <ArrowUpDown
          className="h-3 w-3 transition"
          style={{ color: sortKey === k ? "var(--tint-nb)" : "var(--text-dim)" }}
        />
      </span>
    </th>
  );

  return (
    <div className="space-y-5">
      {/* ─── Month picker ─── */}
      <div className="glass-card flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div
            className="grid h-10 w-10 place-items-center rounded-xl text-white"
            style={{
              background: "var(--grad-primary)",
              boxShadow: "0 4px 16px rgba(99, 102, 241, 0.3)",
            }}
          >
            <CalendarDays className="h-5 w-5" />
          </div>
          <div>
            <div
              className="text-[11px] font-semibold uppercase tracking-wider"
              style={{ color: "var(--text-dim)" }}
            >
              Pilih Bulan
            </div>
            <div
              className="font-display text-base font-semibold"
              style={{ color: "var(--text-primary)" }}
            >
              {monthLabel} {year}
              <span
                className="ml-2 text-xs font-normal"
                style={{ color: "var(--text-muted)" }}
              >
                · {kotaFilterLabel} · {deptFilterLabel}
              </span>
            </div>
          </div>
        </div>
        <div className="filter-group min-w-[180px]">
          <label htmlFor="month-picker">Bulan</label>
          <select
            id="month-picker"
            value={String(selectedMonth)}
            onChange={(e) => setSelectedMonth(Number(e.target.value))}
          >
            {availableMonths.map((m) => (
              <option key={m} value={String(m)}>
                {MONTHS_ID[m]} {year}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* ─── KPI cards ─── */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiTile
          icon={<Wallet className="h-5 w-5" />}
          label={`Total ${monthLabel} ${year}`}
          value={formatIDRCompact(monthTotal)}
          sublabel={formatIDR(monthTotal)}
          trend={monthMoM}
          gradient="linear-gradient(135deg, #6366f1 0%, #ec4899 100%)"
        />
        <KpiTile
          icon={
            monthMoM != null && monthMoM < 0 ? (
              <TrendingDown className="h-5 w-5" />
            ) : (
              <TrendingUp className="h-5 w-5" />
            )
          }
          label={`MoM vs ${prevPeriodLabel}`}
          value={
            monthMoM == null ? "—" : formatPercent(monthMoM, 2)
          }
          sublabel={
            prevMonthTotal == null
              ? "Bulan sebelumnya tidak tersedia"
              : `${prevMonthLabel} ${prev.y}: ${formatIDRCompact(prevMonthTotal)}`
          }
          gradient="linear-gradient(135deg, #06b6d4 0%, #6366f1 100%)"
        />
        <KpiTile
          icon={<Crown className="h-5 w-5" />}
          label="Departemen Teratas"
          value={topDept}
          sublabel={`${formatIDRCompact(deptTotals[topDept])} • ${topDeptShare.toFixed(1)}% kontribusi`}
          gradient="linear-gradient(135deg, #a855f7 0%, #06b6d4 100%)"
        />
        <KpiTile
          icon={<MapPin className="h-5 w-5" />}
          label="Kota Teratas"
          value={topKotaRow ? topKotaRow.name : "—"}
          sublabel={
            topKotaRow
              ? `${formatIDRCompact(topKotaRow.total)} • ${topKotaRow.share.toFixed(1)}% share`
              : "Tidak ada data"
          }
          gradient="linear-gradient(135deg, #f59e0b 0%, #ec4899 100%)"
        />
      </div>

      {/* ─── Per-kota table ─── */}
      <SectionCard
        title={`Detail per Kota • ${monthLabel} ${year}`}
        description={
          hasPrevYear
            ? `Total per cabang dengan share, MoM (vs ${prevPeriodLabel}) & YoY (vs ${monthLabel} ${year - 1}).`
            : `Total per cabang dengan share & MoM (vs ${prevPeriodLabel}). YoY belum tersedia.`
        }
        tag={{ label: "Bulanan · Per Kota", tone: "purple" }}
      >
        <div className="overflow-x-auto rounded-xl">
          <table
            className="w-full min-w-[860px] text-sm"
            style={{
              borderCollapse: "separate",
              borderSpacing: 0,
              borderRadius: 12,
              overflow: "hidden",
            }}
          >
            <thead>
              <tr>
                <Th k="name" label="Kota" align="left" />
                {showNB && <Th k="NB" label="NB" />}
                {showPC && <Th k="PC" label="PC" />}
                {showJASA && <Th k="JASA" label="JASA" />}
                <Th k="total" label="Total" />
                <Th k="share" label="% Share" />
                <Th k="mom" label="MoM" />
                {hasPrevYear && <Th k="yoy" label="YoY" />}
              </tr>
            </thead>
            <tbody>
              {sortedRows.map((r) => {
                const sharePct = (r.share / Math.max(...rows.map((x) => x.share), 1)) * 100;
                return (
                  <tr
                    key={r.kota}
                    style={{ borderBottom: "1px solid var(--border-subtle)" }}
                  >
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-2.5">
                        <div
                          className="grid h-9 w-9 place-items-center rounded-xl text-white"
                          style={{
                            background: KOTA_TINT[r.kota],
                            boxShadow: "0 0 16px rgba(99,102,241,0.25)",
                          }}
                        >
                          <MapPin className="h-4 w-4" />
                        </div>
                        <div>
                          <div
                            className="font-display text-sm font-semibold"
                            style={{ color: "var(--text-primary)" }}
                          >
                            {r.name}
                          </div>
                          <div
                            className="font-mono text-[10px] uppercase tracking-wider"
                            style={{ color: "var(--text-dim)" }}
                          >
                            {r.kota}
                          </div>
                        </div>
                      </div>
                    </td>
                    {showNB && (
                      <td
                        className="px-3 py-3 text-right font-mono tabular-nums"
                        style={{ color: "var(--tint-nb)" }}
                      >
                        {formatIDRCompact(r.NB)}
                      </td>
                    )}
                    {showPC && (
                      <td
                        className="px-3 py-3 text-right font-mono tabular-nums"
                        style={{ color: "var(--tint-pc)" }}
                      >
                        {formatIDRCompact(r.PC)}
                      </td>
                    )}
                    {showJASA && (
                      <td
                        className="px-3 py-3 text-right font-mono tabular-nums"
                        style={{ color: "var(--tint-jasa)" }}
                      >
                        {formatIDRCompact(r.JASA)}
                      </td>
                    )}
                    <td
                      className="px-3 py-3 text-right font-mono font-semibold tabular-nums"
                      style={{ color: "var(--text-primary)" }}
                    >
                      {formatIDR(r.total)}
                    </td>
                    <td className="px-3 py-3 text-right">
                      <div className="flex flex-col items-end gap-1">
                        <span
                          className="font-mono font-semibold tabular-nums"
                          style={{ color: "var(--tint-share)" }}
                        >
                          {r.share.toFixed(1)}%
                        </span>
                        <div
                          className="h-1.5 w-24 rounded-full"
                          style={{ background: "rgba(255,255,255,0.06)" }}
                        >
                          <div
                            className="h-full rounded-full"
                            style={{
                              width: `${Math.min(100, sharePct)}%`,
                              background: KOTA_TINT[r.kota],
                            }}
                          />
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-3 text-right">
                      <PctBadge value={r.mom} />
                    </td>
                    {hasPrevYear && (
                      <td className="px-3 py-3 text-right">
                        <PctBadge value={r.yoy} />
                      </td>
                    )}
                  </tr>
                );
              })}
              {/* Total row */}
              <tr style={{ background: "rgba(99, 102, 241, 0.12)" }}>
                <td
                  className="font-display px-3 py-3 text-left font-bold"
                  style={{ color: "var(--text-primary)" }}
                >
                  Total {monthLabel} {year}
                </td>
                {showNB && (
                  <td
                    className="px-3 py-3 text-right font-mono font-bold tabular-nums"
                    style={{ color: "var(--tint-nb)" }}
                  >
                    {formatIDRCompact(deptTotals.NB)}
                  </td>
                )}
                {showPC && (
                  <td
                    className="px-3 py-3 text-right font-mono font-bold tabular-nums"
                    style={{ color: "var(--tint-pc)" }}
                  >
                    {formatIDRCompact(deptTotals.PC)}
                  </td>
                )}
                {showJASA && (
                  <td
                    className="px-3 py-3 text-right font-mono font-bold tabular-nums"
                    style={{ color: "var(--tint-jasa)" }}
                  >
                    {formatIDRCompact(deptTotals.JASA)}
                  </td>
                )}
                <td
                  className="px-3 py-3 text-right font-mono font-bold tabular-nums"
                  style={{ color: "var(--tint-share)" }}
                >
                  {formatIDR(monthTotal)}
                </td>
                <td
                  className="px-3 py-3 text-right font-mono tabular-nums"
                  style={{ color: "var(--text-muted)" }}
                >
                  100,0%
                </td>
                <td className="px-3 py-3 text-right">
                  <PctBadge value={monthMoM} />
                </td>
                {hasPrevYear && (
                  <td className="px-3 py-3 text-right">
                    <PctBadge value={monthYoY} />
                  </td>
                )}
              </tr>
            </tbody>
          </table>
        </div>
      </SectionCard>

      {/* ─── Department-per-kota stacked bar chart ─── */}
      <SectionCard
        title={`Distribusi Departemen per Kota • ${monthLabel} ${year}`}
        description={`Komposisi ${visibleDepartments.join(" / ")} di tiap cabang untuk bulan ini.`}
        tag={{ label: "Stack · Per Kota", tone: "cyan" }}
      >
        <div className="h-[320px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={stackedRows}
              margin={{ top: 10, right: 16, left: 0, bottom: 0 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="rgba(255,255,255,0.06)"
                vertical={false}
              />
              <XAxis
                dataKey="name"
                tick={{ fill: "var(--text-dim)", fontSize: 11 }}
                axisLine={{ stroke: "var(--border-subtle)" }}
                tickLine={false}
                interval={0}
                tickFormatter={(v: string) =>
                  v.length > 9 ? v.slice(0, 8) + "…" : v
                }
              />
              <YAxis
                tick={{ fill: "var(--text-dim)", fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v: number) => formatIDRCompact(v)}
                width={70}
              />
              <Tooltip
                cursor={{ fill: "rgba(148,163,184,0.08)" }}
                content={
                  <ChartTooltip
                    subtitle={`${monthLabel} ${year}`}
                    showTotal
                  />
                }
              />
              <Legend
                wrapperStyle={{ fontSize: 12, color: "var(--text-muted)" }}
                iconType="circle"
                iconSize={8}
              />
              {visibleDepartments.map((d, i) => (
                <Bar
                  key={d}
                  dataKey={d}
                  name={d}
                  stackId="dept"
                  fill={CHART_COLORS[d]}
                  radius={
                    i === visibleDepartments.length - 1
                      ? [6, 6, 0, 0]
                      : [0, 0, 0, 0]
                  }
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>
      </SectionCard>
    </div>
  );
}
