import { useMemo } from "react";
import type { JasaDatasetState, JasaMonthSummary } from "../lib/jasaDataset";
import { aggregateJasaRecords } from "../lib/jasaDataset";
import { formatNumber, MONTHS_ID } from "../lib/format";

interface Props {
  jasaState: JasaDatasetState;
  year: number;
}

interface ColumnDef {
  key: "jasaSales" | "jasaService" | "jasaPart" | "total";
  label: string;
  cellBg: string;
  headerBg: string;
  accent: string;
}

const COLS: ColumnDef[] = [
  {
    key: "jasaSales",
    label: "Jasa Sales",
    cellBg: "rgba(16, 185, 129, 0.06)",
    headerBg: "rgba(16, 185, 129, 0.18)",
    accent: "var(--tint-jasa-sales)",
  },
  {
    key: "jasaService",
    label: "Jasa Service",
    cellBg: "rgba(99, 102, 241, 0.06)",
    headerBg: "rgba(99, 102, 241, 0.18)",
    accent: "var(--tint-nb)",
  },
  {
    key: "jasaPart",
    label: "Jasa Part",
    cellBg: "rgba(245, 158, 11, 0.06)",
    headerBg: "rgba(245, 158, 11, 0.18)",
    accent: "var(--tint-share)",
  },
  {
    key: "total",
    label: "Total Jasa",
    cellBg: "rgba(245, 158, 11, 0.06)",
    headerBg: "rgba(245, 158, 11, 0.2)",
    accent: "var(--tint-share)",
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
      className="font-mono text-[12px] font-medium tabular-nums"
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

export function JasaMatrix({ jasaState, year }: Props) {
  /**
   * Filter records by year and re-aggregate.
   * JasaRecords (JASA PART / JASA SERVICE) are baseline 2026 data (no year field).
   * JasaSalesRecords DO have a year field and are filtered by the selected year.
   */
  const byMonth = useMemo(() => {
    if (!jasaState.data) return [];
    const filteredRecords = jasaState.data.records; // baseline, always included
    const filteredSales = jasaState.data.jasaSalesRecords.filter(
      (r) => r.year === year
    );
    return aggregateJasaRecords(filteredRecords, filteredSales).byMonth;
  }, [jasaState.data, year]);

  /** Map bulanIndex -> JasaMonthSummary for quick lookup */
  const monthMap = useMemo(() => {
    const map = new Map<number, JasaMonthSummary>();
    for (const m of byMonth) {
      map.set(m.bulanIndex, m);
    }
    return map;
  }, [byMonth]);

  /** Total row across all months */
  const totals = useMemo(() => {
    const t = { jasaSales: 0, jasaService: 0, jasaPart: 0, total: 0 };
    for (const m of byMonth) {
      t.jasaSales += m.jasaSales;
      t.jasaService += m.jasaService;
      t.jasaPart += m.jasaPart;
      t.total += m.total;
    }
    return t;
  }, [byMonth]);

  const subHeaderStyle = (col: ColumnDef) => ({
    ...cellBorderStyle,
    background: col.headerBg,
    color: "var(--th-color)",
  });

  const subHeaderClass =
    "px-3 py-1.5 text-center text-[11px] font-bold uppercase tracking-wider";

  return (
    <div className="overflow-x-auto rounded-xl">
      <table
        className="w-full min-w-[800px] border-separate text-sm"
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
              colSpan={1 + COLS.length * 2}
              className="font-display px-3 py-3 text-center text-base font-bold tracking-tight"
              style={{
                ...cellBorderStyle,
                background:
                  "linear-gradient(135deg, rgba(16, 185, 129, 0.25), rgba(99, 102, 241, 0.25))",
                color: "var(--text-primary)",
                letterSpacing: "0.04em",
              }}
            >
              Jasa {year}
            </th>
          </tr>

          <tr>
            <th
              rowSpan={2}
              className="font-display sticky left-0 z-10 px-3 py-2 text-center text-xs font-bold uppercase tracking-wider"
              style={{
                ...cellBorderStyle,
                background: "rgba(16, 185, 129, 0.18)",
                color: "var(--th-color)",
              }}
            >
              Bulan
            </th>
            {COLS.map((c) => (
              <th
                key={c.key}
                colSpan={2}
                className="font-display px-3 py-2 text-center text-xs font-bold uppercase tracking-wider"
                style={{
                  ...cellBorderStyle,
                  background: c.headerBg,
                  color: "var(--th-color)",
                }}
              >
                {c.label}
              </th>
            ))}
          </tr>

          <tr>
            {COLS.flatMap((c) => [
              <th
                key={`${c.key}-omset`}
                className={subHeaderClass}
                style={subHeaderStyle(c)}
              >
                Omset
              </th>,
              <th
                key={`${c.key}-mom`}
                className={subHeaderClass}
                style={subHeaderStyle(c)}
              >
                MoM
              </th>,
            ])}
          </tr>
        </thead>

        <tbody>
          {MONTHS_ID.map((m, idx) => {
            const cur = monthMap.get(idx) ?? null;
            const prev = idx > 0 ? (monthMap.get(idx - 1) ?? null) : null;
            // If the current month has no data (total === 0), show dash for MoM
            const curHasData = cur != null && cur.total > 0;

            return (
              <tr
                key={m}
                className="transition-colors"
                style={{ background: "transparent" }}
              >
                <td
                  className="sticky left-0 z-10 px-3 py-2 text-center font-medium"
                  style={{
                    ...cellBorderStyle,
                    background: "rgba(16, 185, 129, 0.06)",
                    color: "var(--th-color)",
                  }}
                >
                  {m}
                </td>
                {COLS.flatMap((c) => {
                  const curVal = cur ? cur[c.key] : 0;
                  const prevVal = prev ? prev[c.key] : null;
                  // Only calculate MoM if current month has actual data
                  const mom = !curHasData || idx === 0 ? null : pctChange(curVal, prevVal);

                  return [
                    <td
                      key={`${m}-${c.key}-omset`}
                      className="px-3 py-2 text-right tabular-nums"
                      style={{
                        ...cellBorderStyle,
                        background: c.cellBg,
                      }}
                    >
                      {curVal === 0 ? (
                        <span style={{ color: "var(--text-dim)" }}>0</span>
                      ) : (
                        <span
                          className="font-mono"
                          style={{ color: "var(--text-primary)" }}
                        >
                          {formatNumber(curVal)}
                        </span>
                      )}
                    </td>,
                    <td
                      key={`${m}-${c.key}-mom`}
                      className="px-3 py-2 text-right"
                      style={{ ...cellBorderStyle, background: c.cellBg }}
                    >
                      <PctCell value={mom} />
                    </td>,
                  ];
                })}
              </tr>
            );
          })}

          {/* Total row */}
          <tr className="font-bold">
            <td
              className="sticky left-0 z-10 px-3 py-2.5 text-center"
              style={{
                ...cellBorderStyle,
                background:
                  "linear-gradient(135deg, rgba(16, 185, 129, 0.3), rgba(99, 102, 241, 0.3))",
                color: "var(--text-primary)",
              }}
            >
              Total
            </td>
            {COLS.flatMap((c) => {
              const totalBg =
                "linear-gradient(135deg, rgba(16, 185, 129, 0.18), rgba(99, 102, 241, 0.18))";
              return [
                <td
                  key={`total-${c.key}-omset`}
                  className="px-3 py-2.5 text-right tabular-nums"
                  style={{
                    ...cellBorderStyle,
                    background: totalBg,
                    color: "var(--text-primary)",
                  }}
                >
                  <span className="font-mono">{formatNumber(totals[c.key])}</span>
                </td>,
                <td
                  key={`total-${c.key}-mom`}
                  className="px-3 py-2.5 text-right"
                  style={{
                    ...cellBorderStyle,
                    background: totalBg,
                    color: "var(--text-dim)",
                  }}
                >
                  &mdash;
                </td>,
              ];
            })}
          </tr>
        </tbody>
      </table>
    </div>
  );
}
