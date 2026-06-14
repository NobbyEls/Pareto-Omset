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

interface Props {
  data: ParsedDataset;
  year: number;
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
    accent: "#a5b4fc",
    cellClass: "matrix-cell-nb",
    headerClass: "matrix-header-nb",
  },
  {
    key: "PC",
    label: "PC",
    cellBg: "rgba(6, 182, 212, 0.06)",
    headerBg: "rgba(6, 182, 212, 0.18)",
    accent: "#67e8f9",
    cellClass: "matrix-cell-pc",
    headerClass: "matrix-header-pc",
  },
  {
    key: "JASA",
    label: "JASA",
    cellBg: "rgba(236, 72, 153, 0.06)",
    headerBg: "rgba(236, 72, 153, 0.18)",
    accent: "#f9a8d4",
    cellClass: "matrix-cell-jasa",
    headerClass: "matrix-header-jasa",
  },
  {
    key: "TOTAL",
    label: "Total Omset",
    cellBg: "rgba(245, 158, 11, 0.06)",
    headerBg: "rgba(245, 158, 11, 0.2)",
    accent: "#fcd34d",
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
    return <span style={{ color: "var(--text-dim)" }}>—</span>;
  }
  const positive = value >= 0;
  return (
    <span
      className={`font-mono text-[12px] font-medium tabular-nums ${positive ? "matrix-pct-pos" : "matrix-pct-neg"}`}
      style={{ color: positive ? "#67e8f9" : "#fb7185" }}
    >
      {formatPctID(value)}
    </span>
  );
}

const cellBorderStyle = {
  borderTop: "1px solid var(--border-subtle)",
  borderLeft: "1px solid var(--border-subtle)",
};

export function YearlyMatrix({ data, year }: Props) {
  const prevYear = year - 1;
  const hasPrevYear = data.years.includes(prevYear);

  const cellValue = (
    y: number,
    monthIdx: number,
    col: ColKey
  ): number | null => {
    if (col === "TOTAL") return totalFor(data.pivot, y, monthIdx);
    const v = data.pivot[y]?.[monthIdx]?.[col];
    return typeof v === "number" ? v : null;
  };

  const totals = useMemo(() => {
    const t: Record<ColKey, number> = { NB: 0, PC: 0, JASA: 0, TOTAL: 0 };
    for (const d of DEPARTMENTS) t[d] = deptTotalForYear(data.pivot, year, d);
    t.TOTAL = totalForYear(data.pivot, year);
    return t;
  }, [data, year]);

  const prevTotals = useMemo(() => {
    const t: Record<ColKey, number> = { NB: 0, PC: 0, JASA: 0, TOTAL: 0 };
    if (!hasPrevYear) return t;
    for (const d of DEPARTMENTS) t[d] = deptTotalForYear(data.pivot, prevYear, d);
    t.TOTAL = totalForYear(data.pivot, prevYear);
    return t;
  }, [data, prevYear, hasPrevYear]);

  const subHeaderStyle = (col: ColumnDef) => ({
    ...cellBorderStyle,
    background: col.headerBg,
    color: col.accent,
  });

  const subHeaderClass = (col: ColumnDef) =>
    `px-3 py-1.5 text-right text-[11px] font-bold uppercase tracking-wider ${col.headerClass}`;

  return (
    <div className="overflow-x-auto rounded-xl">
      <table
        className="w-full min-w-[1100px] border-separate text-sm"
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
              colSpan={1 + COLS.length * 3}
              className="font-display px-3 py-3 text-center text-base font-bold tracking-tight"
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
              className="font-display sticky left-0 z-10 px-3 py-2 text-center text-xs font-bold uppercase tracking-wider"
              style={{
                ...cellBorderStyle,
                background: "rgba(99, 102, 241, 0.18)",
                color: "#c7d2fe",
              }}
            >
              Bulan
            </th>
            {COLS.map((c) => (
              <th
                key={c.key}
                colSpan={3}
                className={`font-display px-3 py-2 text-center text-xs font-bold uppercase tracking-wider ${c.headerClass}`}
                style={{
                  ...cellBorderStyle,
                  background: c.headerBg,
                  color: c.accent,
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
          {MONTHS_ID.map((m, idx) => (
            <tr
              key={m}
              className="transition-colors"
              style={{ background: "transparent" }}
            >
              <td
                className="sticky left-0 z-10 px-3 py-2 text-left font-medium"
                style={{
                  ...cellBorderStyle,
                  background: "rgba(99, 102, 241, 0.06)",
                  color: "#c7d2fe",
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
                      : null;
                const yoyPrev = hasPrevYear
                  ? cellValue(prevYear, idx, c.key)
                  : null;
                const mom = pctChange(cur, prevMonth);
                const yoy = pctChange(cur, yoyPrev);

                return [
                  <td
                    key={`${m}-${c.key}-omset`}
                    className={`px-3 py-2 text-right tabular-nums ${c.cellClass}`}
                    style={{ ...cellBorderStyle, background: c.cellBg }}
                  >
                    {cur == null ? (
                      <span style={{ color: "var(--text-dim)" }}>0</span>
                    ) : (
                      <span
                        className="font-mono"
                        style={{ color: "var(--text-primary)" }}
                      >
                        {formatNumber(cur)}
                      </span>
                    )}
                  </td>,
                  <td
                    key={`${m}-${c.key}-mom`}
                    className={`px-3 py-2 text-right ${c.cellClass}`}
                    style={{ ...cellBorderStyle, background: c.cellBg }}
                  >
                    <PctCell value={mom} />
                  </td>,
                  <td
                    key={`${m}-${c.key}-yoy`}
                    className={`px-3 py-2 text-right ${c.cellClass}`}
                    style={{ ...cellBorderStyle, background: c.cellBg }}
                  >
                    <PctCell value={yoy} />
                  </td>,
                ];
              })}
            </tr>
          ))}

          <tr className={classNames("font-bold")}>
            <td
              className="sticky left-0 z-10 px-3 py-2.5 text-left"
              style={{
                ...cellBorderStyle,
                background:
                  "linear-gradient(135deg, rgba(99, 102, 241, 0.3), rgba(236, 72, 153, 0.3))",
                color: "#fff",
              }}
            >
              Total
            </td>
            {COLS.flatMap((c) => {
              const cur = totals[c.key];
              const prev = prevTotals[c.key];
              const yoy = hasPrevYear ? pctChange(cur, prev) : null;
              const totalBg =
                "linear-gradient(135deg, rgba(99, 102, 241, 0.18), rgba(236, 72, 153, 0.18))";
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
                  <span className="font-mono">{formatNumber(cur)}</span>
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
                  —
                </td>,
                <td
                  key={`total-${c.key}-yoy`}
                  className="px-3 py-2.5 text-right"
                  style={{ ...cellBorderStyle, background: totalBg }}
                >
                  <PctCell value={yoy} />
                </td>,
              ];
            })}
          </tr>
        </tbody>
      </table>
    </div>
  );
}
