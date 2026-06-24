import { useMemo } from "react";
import {
  type Department,
  type ParsedDataset,
  DEPARTMENTS,
  totalFor,
  deptTotalForYear,
  totalForYear,
} from "../lib/csvParser";
import { formatNumber, MONTHS_ID, classNames } from "../lib/format";
import { isCurrentMonth, estimateValue } from "../lib/estimation";

interface Props {
  data: ParsedDataset;
  year: number;
  /** Changes when setDataDate() completes, forcing memo recalculation. */
  estimationKey: number;
}

type ColKey = Department | "TOTAL";

interface ColumnDef {
  key: ColKey;
  label: string;
  /** Department-tinted cell background (rgba). */
  cellBg: string;
  /** Header cell tint. */
  headerBg: string;
  /** Accent text color when emphasized. */
  accent: string;
  /** CSS class for light-mode override. */
  cellClass: string;
  headerClass: string;
}

const COLS: ColumnDef[] = [
  {
    key: "NB",
    label: "NB",
    cellBg: "rgba(99, 102, 241, 0.06)",
    headerBg: "rgba(99, 102, 241, 0.18)",
    accent: "var(--tint-nb)",
    cellClass: "matrix-cell-nb",
    headerClass: "matrix-header-nb",
  },
  {
    key: "PC",
    label: "PC",
    cellBg: "rgba(6, 182, 212, 0.06)",
    headerBg: "rgba(6, 182, 212, 0.18)",
    accent: "var(--tint-pc)",
    cellClass: "matrix-cell-pc",
    headerClass: "matrix-header-pc",
  },
  {
    key: "JASA",
    label: "JASA",
    cellBg: "rgba(236, 72, 153, 0.06)",
    headerBg: "rgba(236, 72, 153, 0.18)",
    accent: "var(--tint-jasa)",
    cellClass: "matrix-cell-jasa",
    headerClass: "matrix-header-jasa",
  },
  {
    key: "TOTAL",
    label: "Total Omset",
    cellBg: "rgba(245, 158, 11, 0.06)",
    headerBg: "rgba(245, 158, 11, 0.2)",
    accent: "var(--tint-share)",
    cellClass: "matrix-cell-total",
    headerClass: "matrix-header-total",
  },
];

function formatPctID(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return "";
  const sign = n < 0 ? "-" : "";
  return `${sign}${Math.abs(n).toFixed(2).replace(".", ",")}%`;
}

function pctChange(
  cur: number | null | undefined,
  prev: number | null | undefined
): number | null {
  if (cur == null || !Number.isFinite(cur)) return null;
  if (prev == null || !Number.isFinite(prev) || prev === 0) return null;
  return ((cur - prev) / prev) * 100;
}

function PctCell({ value }: { value: number | null }) {
  if (value == null) {
    return <span style={{ color: "var(--text-dim)" }}>&mdash;</span>;
  }
  const positive = value >= 0;
  return (
    <span
      className={`font-mono text-[10px] font-semibold tabular-nums ${positive ? "matrix-pct-pos" : "matrix-pct-neg"}`}
      style={{ color: positive ? "var(--trend-up)" : "var(--trend-down)" }}
    >
      {formatPctID(value)}
    </span>
  );
}

const cellBorderStyle = {
  borderTop: "1px solid var(--border-subtle)",
  borderLeft: "1px solid var(--border-subtle)",
};

// Total columns: 1 (Bulan) + 4 groups * 3 sub-cols + 1 (Growth) = 14
const TOTAL_COLSPAN = 1 + COLS.length * 3 + 1;

export function YearlyMatrix({ data, year, estimationKey }: Props) {
  const prevYear = year - 1;
  const hasPrevYear = data.years.includes(prevYear);

  /** Get cell value with estimation applied for the current month. */
  const cellValue = (
    y: number,
    monthIdx: number,
    col: ColKey
  ): { value: number | null; isEstimated: boolean } => {
    let raw: number | null;
    if (col === "TOTAL") {
      raw = totalFor(data.pivot, y, monthIdx);
    } else {
      const v = data.pivot[y]?.[monthIdx]?.[col];
      raw = typeof v === "number" ? v : null;
    }
    if (raw == null) return { value: null, isEstimated: false };
    const est = estimateValue(raw, y, monthIdx);
    return { value: est.value, isEstimated: est.isEstimated };
  };

  const totals = useMemo(() => {
    const t: Record<ColKey, number> = { NB: 0, PC: 0, JASA: 0, TOTAL: 0 };
    for (const d of DEPARTMENTS) {
      let sum = 0;
      for (let i = 0; i < 12; i++) {
        const v = data.pivot[year]?.[i]?.[d];
        if (typeof v === "number") {
          const est = estimateValue(v, year, i);
          sum += est.value;
        }
      }
      t[d] = sum;
    }
    t.TOTAL = t.NB + t.PC + t.JASA;
    return t;
  }, [data, year, estimationKey]);

  const prevTotals = useMemo(() => {
    const t: Record<ColKey, number> = { NB: 0, PC: 0, JASA: 0, TOTAL: 0 };
    if (!hasPrevYear) return t;
    for (const d of DEPARTMENTS) t[d] = deptTotalForYear(data.pivot, prevYear, d);
    t.TOTAL = totalForYear(data.pivot, prevYear);
    return t;
  }, [data, prevYear, hasPrevYear]);

  /** Last month index that has actual data in the current year. */
  const lastActiveMonth = useMemo(() => {
    let last = -1;
    for (let i = 0; i < 12; i++) {
      const raw = totalFor(data.pivot, year, i);
      if (raw != null && raw !== 0) last = i;
    }
    return last;
  }, [data, year]);

  /** YTD totals for prev year (only Jan..lastActiveMonth) per department. */
  const prevTotalsYTD = useMemo(() => {
    const t: Record<ColKey, number> = { NB: 0, PC: 0, JASA: 0, TOTAL: 0 };
    if (!hasPrevYear || lastActiveMonth < 0) return t;
    for (const d of DEPARTMENTS) {
      let sum = 0;
      for (let i = 0; i <= lastActiveMonth; i++) {
        const v = data.pivot[prevYear]?.[i]?.[d];
        if (typeof v === "number") sum += v;
      }
      t[d] = sum;
    }
    t.TOTAL = t.NB + t.PC + t.JASA;
    return t;
  }, [data, prevYear, hasPrevYear, lastActiveMonth]);

  /** YTD totals for current year (only Jan..lastActiveMonth, with estimation). */
  const curTotalsYTD = useMemo(() => {
    const t: Record<ColKey, number> = { NB: 0, PC: 0, JASA: 0, TOTAL: 0 };
    if (lastActiveMonth < 0) return t;
    for (const d of DEPARTMENTS) {
      let sum = 0;
      for (let i = 0; i <= lastActiveMonth; i++) {
        const v = data.pivot[year]?.[i]?.[d];
        if (typeof v === "number") {
          const est = estimateValue(v, year, i);
          sum += est.value;
        }
      }
      t[d] = sum;
    }
    t.TOTAL = t.NB + t.PC + t.JASA;
    return t;
  }, [data, year, lastActiveMonth, estimationKey]);

  // Check if any month in the current year has estimation applied
  const hasEstimation = useMemo(() => {
    for (let i = 0; i < 12; i++) {
      if (isCurrentMonth(year, i)) {
        const raw = totalFor(data.pivot, year, i);
        if (raw != null) return true;
      }
    }
    return false;
  }, [data, year, estimationKey]);

  const subHeaderStyle = (col: ColumnDef) => ({
    ...cellBorderStyle,
    background: col.headerBg,
    color: col.accent,
  });

  const subHeaderClass = (col: ColumnDef) =>
    `px-1 py-1 text-center text-[9px] font-bold uppercase tracking-wider ${col.headerClass}`;

  /**
   * YTD Growth (single value): accumulate from Jan to the last month with data
   * (including estimation) and compare vs same period prev year.
   */
  const ytdGrowthFinal = useMemo<{ value: number; label: string } | null>(() => {
    if (!hasPrevYear) return null;
    let ytdCur = 0;
    let lastActiveMonth = -1;
    let hasEstInPeriod = false;

    for (let i = 0; i < 12; i++) {
      const cur = cellValue(year, i, "TOTAL");
      if (cur.value != null && cur.value !== 0) {
        ytdCur += cur.value;
        lastActiveMonth = i;
        if (cur.isEstimated) hasEstInPeriod = true;
      }
    }

    if (lastActiveMonth < 0) return null;

    let prevSum = 0;
    for (let i = 0; i <= lastActiveMonth; i++) {
      const prev = cellValue(prevYear, i, "TOTAL");
      if (prev.value != null) prevSum += prev.value;
    }
    if (prevSum === 0) return null;

    const pct = ((ytdCur - prevSum) / prevSum) * 100;

    const startLabel = MONTHS_ID[0].substring(0, 3);
    const endLabel = MONTHS_ID[lastActiveMonth].substring(0, 3);
    const estNote = hasEstInPeriod ? `\n(${MONTHS_ID[lastActiveMonth]}: estimasi)` : "";
    const label = `${startLabel} \u2013 ${endLabel} ${year}${estNote}\nvs ${startLabel} \u2013 ${endLabel} ${prevYear}`;

    return { value: pct, label };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, year, prevYear, hasPrevYear, estimationKey]);

  const growthHeaderBg = "rgba(34, 197, 94, 0.18)";
  const growthCellBg = "rgba(34, 197, 94, 0.06)";
  const growthAccent = "#22c55e";

  return (
    <div className="rounded-xl">
      <table
        className="w-full border-separate text-[11px]"
        style={{
          borderSpacing: 0,
          borderRight: "1px solid var(--border-subtle)",
          borderBottom: "1px solid var(--border-subtle)",
          borderRadius: 12,
          overflow: "hidden",
        }}
      >
        <thead>
          <tr>
            <th
              colSpan={TOTAL_COLSPAN}
              className="font-display px-2 py-2 text-center text-base font-bold tracking-tight"
              style={{
                ...cellBorderStyle,
                background:
                  "linear-gradient(135deg, rgba(99, 102, 241, 0.25), rgba(236, 72, 153, 0.25))",
                color: "var(--text-primary)",
                letterSpacing: "0.04em",
              }}
            >
              {year}
            </th>
          </tr>

          <tr>
            <th
              rowSpan={2}
              className="font-display sticky left-0 z-10 px-1.5 py-1.5 text-center text-xs font-bold uppercase tracking-wider"
              style={{
                ...cellBorderStyle,
                background: "rgba(99, 102, 241, 0.18)",
                color: "var(--tint-year-header)",
              }}
            >
              Bulan
            </th>
            {COLS.map((c) => (
              <th
                key={c.key}
                colSpan={3}
                className={`font-display px-1.5 py-1.5 text-center text-xs font-bold uppercase tracking-wider ${c.headerClass}`}
                style={{
                  ...cellBorderStyle,
                  background: c.headerBg,
                  color: c.accent,
                }}
              >
                {c.label}
              </th>
            ))}
            <th
              rowSpan={2}
              className="font-display px-1.5 py-1.5 text-center text-xs font-bold uppercase tracking-wider"
              style={{
                ...cellBorderStyle,
                background: growthHeaderBg,
                color: growthAccent,
              }}
            >
              Growth
            </th>
          </tr>

          <tr>
            {COLS.flatMap((c) => [
              <th
                key={`${c.key}-omset`}
                className={subHeaderClass(c)}
                style={subHeaderStyle(c)}
              >
                Omset
              </th>,
              <th
                key={`${c.key}-mom`}
                className={subHeaderClass(c)}
                style={subHeaderStyle(c)}
              >
                MoM
              </th>,
              <th
                key={`${c.key}-yoy`}
                className={subHeaderClass(c)}
                style={subHeaderStyle(c)}
              >
                YoY
              </th>,
            ])}
          </tr>
        </thead>

        <tbody>
          {MONTHS_ID.map((m, idx) => {
            const isEst = isCurrentMonth(year, idx);
            return (
              <tr
                key={m}
                className="transition-colors"
                style={{ background: "transparent" }}
              >
                <td
                  className="sticky left-0 z-10 px-1.5 py-1.5 text-center font-medium"
                  style={{
                    ...cellBorderStyle,
                    background: "rgba(99, 102, 241, 0.06)",
                    color: "var(--tint-year-header)",
                  }}
                >
                  {m}
                </td>
                {COLS.flatMap((c) => {
                  const cur = cellValue(year, idx, c.key);
                  // MoM: bulan sebelumnya. Untuk Januari (idx 0), ambil dari
                  // Desember tahun sebelumnya supaya growth tetap terhitung.
                  const prevMonth =
                    idx > 0
                      ? cellValue(year, idx - 1, c.key)
                      : hasPrevYear
                        ? cellValue(prevYear, 11, c.key)
                        : { value: null, isEstimated: false };
                  const yoyPrev = hasPrevYear
                    ? cellValue(prevYear, idx, c.key)
                    : { value: null, isEstimated: false };
                  const mom = pctChange(cur.value, prevMonth.value);
                  const yoy = pctChange(cur.value, yoyPrev.value);

                  const estStyle = isEst && cur.isEstimated
                    ? { fontStyle: "italic" as const, opacity: 0.75 }
                    : {};

                  return [
                    <td
                      key={`${m}-${c.key}-omset`}
                      className={`px-1.5 py-1.5 text-right tabular-nums ${c.cellClass}`}
                      style={{
                        ...cellBorderStyle,
                        background: c.cellBg,
                        borderLeft: isEst && cur.isEstimated
                          ? "2px dashed var(--border-medium)"
                          : cellBorderStyle.borderLeft,
                      }}
                    >
                      {cur.value == null ? (
                        <span style={{ color: "var(--text-dim)" }}>0</span>
                      ) : (
                        <span
                          className="font-mono font-semibold"
                          style={{ color: "var(--text-primary)", ...estStyle }}
                        >
                          {formatNumber(cur.value)}
                          {cur.isEstimated && (
                            <span
                              className="ml-1 text-[10px]"
                              style={{ color: "var(--text-dim)" }}
                            >
                              (Est)
                            </span>
                          )}
                        </span>
                      )}
                    </td>,
                    <td
                      key={`${m}-${c.key}-mom`}
                      className={`px-1.5 py-1.5 text-right ${c.cellClass}`}
                      style={{ ...cellBorderStyle, background: c.cellBg }}
                    >
                      <span style={estStyle}>
                        <PctCell value={mom} />
                      </span>
                    </td>,
                    <td
                      key={`${m}-${c.key}-yoy`}
                      className={`px-1.5 py-1.5 text-right ${c.cellClass}`}
                      style={{ ...cellBorderStyle, background: c.cellBg }}
                    >
                      <span style={estStyle}>
                        <PctCell value={yoy} />
                      </span>
                    </td>,
                  ];
                })}
                {/* Growth column — single merged cell, only on first row */}
                {idx === 0 && (
                  <td
                    rowSpan={13}
                    className="px-2 py-2 text-center align-middle"
                    style={{
                      ...cellBorderStyle,
                      background: growthCellBg,
                      verticalAlign: "middle",
                    }}
                  >
                    {(() => {
                      const g = ytdGrowthFinal;
                      if (g == null) return <span style={{ color: "var(--text-dim)" }}>&mdash;</span>;
                      const positive = g.value >= 0;
                      return (
                        <span
                          className="font-mono text-sm font-bold"
                          style={{ color: positive ? "var(--trend-up)" : "var(--trend-down)" }}
                        >
                          {formatPctID(g.value)}
                        </span>
                      );
                    })()}
                  </td>
                )}
              </tr>
            );
          })}

          <tr className={classNames("font-bold")}>
            <td
              className="sticky left-0 z-10 px-1.5 py-2 text-center"
              style={{
                ...cellBorderStyle,
                background:
                  "linear-gradient(135deg, rgba(99, 102, 241, 0.3), rgba(236, 72, 153, 0.3))",
                color: "var(--text-primary)",
              }}
            >
              Total
              {hasEstimation && (
                <span
                  className="ml-1 text-[10px] font-normal"
                  style={{ color: "var(--text-dim)", fontStyle: "italic" }}
                >
                  *
                </span>
              )}
            </td>
            {COLS.flatMap((c) => {
              const cur = totals[c.key];
              const growthYTD = hasPrevYear && prevTotalsYTD[c.key] > 0
                ? pctChange(curTotalsYTD[c.key], prevTotalsYTD[c.key])
                : null;
              const totalBg =
                "linear-gradient(135deg, rgba(99, 102, 241, 0.18), rgba(236, 72, 153, 0.18))";
              return [
                <td
                  key={`total-${c.key}-omset`}
                  className="px-1.5 py-2 text-right tabular-nums"
                  style={{
                    ...cellBorderStyle,
                    background: totalBg,
                    color: "var(--text-primary)",
                  }}
                >
                  <span className="font-mono font-semibold">{formatNumber(cur)}</span>
                </td>,
                <td
                  key={`total-${c.key}-mom`}
                  className="px-1.5 py-2 text-right"
                  style={{
                    ...cellBorderStyle,
                    background: totalBg,
                    color: "var(--text-dim)",
                  }}
                >
                  &mdash;
                </td>,
                <td
                  key={`total-${c.key}-yoy`}
                  className="px-1.5 py-2 text-right"
                  style={{ ...cellBorderStyle, background: totalBg }}
                >
                  <PctCell value={growthYTD} />
                </td>,
              ];
            })}
          </tr>
        </tbody>
      </table>
      {hasEstimation && (
        <p
          className="mt-2 text-[11px]"
          style={{ color: "var(--text-dim)", fontStyle: "italic" }}
        >
          * Termasuk estimasi bulan berjalan
        </p>
      )}
    </div>
  );
}
