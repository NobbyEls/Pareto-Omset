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

const COLS: { key: ColKey; label: string; tint: string; tintHeader: string }[] = [
  {
    key: "NB",
    label: "NB",
    tint: "bg-orange-50/70 dark:bg-orange-500/[0.06]",
    tintHeader: "bg-orange-100 dark:bg-orange-500/15",
  },
  {
    key: "PC",
    label: "PC",
    tint: "bg-sky-50/70 dark:bg-sky-500/[0.06]",
    tintHeader: "bg-sky-100 dark:bg-sky-500/15",
  },
  {
    key: "JASA",
    label: "JASA",
    tint: "bg-amber-50/70 dark:bg-amber-500/[0.06]",
    tintHeader: "bg-amber-100 dark:bg-amber-500/15",
  },
  {
    key: "TOTAL",
    label: "Total Omset",
    tint: "bg-rose-50/70 dark:bg-rose-500/[0.06]",
    tintHeader: "bg-rose-100 dark:bg-rose-500/15",
  },
];

function formatPctID(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return "";
  // Indonesian style: comma decimal, 2 decimals, no plus prefix, only minus.
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
    return <span className="text-slate-300 dark:text-slate-600">—</span>;
  }
  const positive = value >= 0;
  return (
    <span
      className={classNames(
        "tabular-nums font-medium",
        positive
          ? "text-sky-600 dark:text-sky-400"
          : "text-rose-600 dark:text-rose-400"
      )}
    >
      {formatPctID(value)}
    </span>
  );
}

export function YearlyMatrix({ data, year }: Props) {
  const prevYear = year - 1;
  const hasPrevYear = data.years.includes(prevYear);

  /** value lookup, with TOTAL as the derived sum */
  const cellValue = (
    y: number,
    monthIdx: number,
    col: ColKey
  ): number | null => {
    if (col === "TOTAL") return totalFor(data.pivot, y, monthIdx);
    const v = data.pivot[y]?.[monthIdx]?.[col];
    return typeof v === "number" ? v : null;
  };

  // Year totals by column
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

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[1100px] border-separate border-spacing-0 text-sm">
        <thead>
          {/* Title row */}
          <tr>
            <th
              colSpan={1 + COLS.length * 3}
              className="border-b-2 border-emerald-200 bg-emerald-100 px-3 py-2.5 text-center text-base font-bold tracking-tight text-emerald-900 dark:border-emerald-500/30 dark:bg-emerald-500/15 dark:text-emerald-200"
            >
              {year}
            </th>
          </tr>
          {/* Department header row */}
          <tr>
            <th
              rowSpan={2}
              className="sticky left-0 z-10 border border-emerald-200 bg-emerald-50 px-3 py-2 text-center text-xs font-bold uppercase tracking-wider text-emerald-900 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-200"
            >
              Bulan
            </th>
            {COLS.map((c) => (
              <th
                key={c.key}
                colSpan={3}
                className={classNames(
                  "border border-emerald-200 px-3 py-2 text-center text-xs font-bold uppercase tracking-wider text-emerald-900 dark:border-emerald-500/20 dark:text-emerald-200",
                  c.tintHeader
                )}
              >
                {c.label}
              </th>
            ))}
          </tr>
          {/* Sub-column header */}
          <tr>
            {COLS.flatMap((c) => [
              <th
                key={`${c.key}-omset`}
                className={classNames(
                  "border border-emerald-200 px-3 py-1.5 text-right text-[11px] font-bold uppercase tracking-wider text-emerald-900 dark:border-emerald-500/20 dark:text-emerald-200",
                  c.tintHeader
                )}
              >
                Omset
              </th>,
              <th
                key={`${c.key}-mom`}
                className={classNames(
                  "border border-emerald-200 px-3 py-1.5 text-right text-[11px] font-bold uppercase tracking-wider text-emerald-900 dark:border-emerald-500/20 dark:text-emerald-200",
                  c.tintHeader
                )}
              >
                MoM
              </th>,
              <th
                key={`${c.key}-yoy`}
                className={classNames(
                  "border border-emerald-200 px-3 py-1.5 text-right text-[11px] font-bold uppercase tracking-wider text-emerald-900 dark:border-emerald-500/20 dark:text-emerald-200",
                  c.tintHeader
                )}
              >
                YoY
              </th>,
            ])}
          </tr>
        </thead>
        <tbody>
          {MONTHS_ID.map((m, idx) => {
            return (
              <tr
                key={m}
                className="transition-colors hover:bg-slate-50 dark:hover:bg-white/[0.02]"
              >
                <td className="sticky left-0 z-10 border border-slate-200 bg-emerald-50/60 px-3 py-2 text-left font-medium text-emerald-900 dark:border-white/10 dark:bg-emerald-500/[0.06] dark:text-emerald-200">
                  {m}
                </td>
                {COLS.flatMap((c) => {
                  const cur = cellValue(year, idx, c.key);
                  const prevMonth = idx > 0 ? cellValue(year, idx - 1, c.key) : null;
                  const yoyPrev = hasPrevYear
                    ? cellValue(prevYear, idx, c.key)
                    : null;
                  const mom = pctChange(cur, prevMonth);
                  const yoy = pctChange(cur, yoyPrev);
                  return [
                    <td
                      key={`${m}-${c.key}-omset`}
                      className={classNames(
                        "border border-slate-200 px-3 py-2 text-right tabular-nums dark:border-white/10",
                        c.tint
                      )}
                    >
                      {cur == null ? (
                        <span className="text-slate-400 dark:text-slate-600">
                          0
                        </span>
                      ) : (
                        <span className="font-medium text-slate-800 dark:text-slate-100">
                          {formatNumber(cur)}
                        </span>
                      )}
                    </td>,
                    <td
                      key={`${m}-${c.key}-mom`}
                      className={classNames(
                        "border border-slate-200 px-3 py-2 text-right dark:border-white/10",
                        c.tint
                      )}
                    >
                      <PctCell value={mom} />
                    </td>,
                    <td
                      key={`${m}-${c.key}-yoy`}
                      className={classNames(
                        "border border-slate-200 px-3 py-2 text-right dark:border-white/10",
                        c.tint
                      )}
                    >
                      <PctCell value={yoy} />
                    </td>,
                  ];
                })}
              </tr>
            );
          })}

          {/* Year total row */}
          <tr className="font-bold">
            <td className="sticky left-0 z-10 border border-emerald-300 bg-emerald-200/70 px-3 py-2.5 text-left text-emerald-900 dark:border-emerald-500/30 dark:bg-emerald-500/20 dark:text-emerald-100">
              Total
            </td>
            {COLS.flatMap((c) => {
              const cur = totals[c.key];
              const prev = prevTotals[c.key];
              const yoy = hasPrevYear ? pctChange(cur, prev) : null;
              return [
                <td
                  key={`total-${c.key}-omset`}
                  className={classNames(
                    "border border-emerald-300 px-3 py-2.5 text-right tabular-nums text-slate-900 dark:border-emerald-500/30 dark:text-slate-100",
                    "bg-emerald-100/80 dark:bg-emerald-500/15"
                  )}
                >
                  {formatNumber(cur)}
                </td>,
                <td
                  key={`total-${c.key}-mom`}
                  className={classNames(
                    "border border-emerald-300 px-3 py-2.5 text-right text-slate-400 dark:border-emerald-500/30 dark:text-slate-600",
                    "bg-emerald-100/80 dark:bg-emerald-500/15"
                  )}
                >
                  —
                </td>,
                <td
                  key={`total-${c.key}-yoy`}
                  className={classNames(
                    "border border-emerald-300 px-3 py-2.5 text-right dark:border-emerald-500/30",
                    "bg-emerald-100/80 dark:bg-emerald-500/15"
                  )}
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
