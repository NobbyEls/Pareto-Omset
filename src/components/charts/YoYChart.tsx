import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import { formatIDRCompact, formatPercent, MONTHS_ID } from "../../lib/format";
import {
  type Department,
  type ParsedDataset,
  totalFor,
  DEPARTMENTS,
} from "../../lib/csvParser";
import { ChartTooltip } from "./ChartTooltip";

interface Props {
  data: ParsedDataset;
  primaryYear: number;
  selectedDepartments: Department[];
}

/**
 * Side-by-side comparison of primary year vs (primary year - 1) per month,
 * with a YoY-growth line overlay (right axis).
 */
export function YoYChart({ data, primaryYear, selectedDepartments }: Props) {
  const prevYear = primaryYear - 1;
  const useDeptFilter =
    selectedDepartments.length > 0 &&
    selectedDepartments.length < DEPARTMENTS.length;

  const valueFor = (year: number, monthIdx: number): number | null => {
    if (!useDeptFilter) return totalFor(data.pivot, year, monthIdx);
    let s = 0;
    let any = false;
    for (const d of selectedDepartments) {
      const v = data.pivot[year]?.[monthIdx]?.[d];
      if (typeof v === "number") {
        s += v;
        any = true;
      }
    }
    return any ? s : null;
  };

  const rows = MONTHS_ID.map((m, idx) => {
    const cur = valueFor(primaryYear, idx);
    const prev = valueFor(prevYear, idx);
    const growth =
      cur != null && prev != null && prev > 0
        ? ((cur - prev) / prev) * 100
        : null;
    return {
      month: m,
      [String(prevYear)]: prev,
      [String(primaryYear)]: cur,
      growth,
    };
  });

  return (
    <ResponsiveContainer width="100%" height={320}>
      <ComposedChart
        data={rows}
        margin={{ top: 10, right: 24, left: 0, bottom: 0 }}
      >
        <CartesianGrid
          strokeDasharray="3 3"
          stroke="currentColor"
          className="text-slate-200 dark:text-white/5"
          vertical={false}
        />
        <XAxis
          dataKey="month"
          tickLine={false}
          axisLine={false}
          tick={{ fontSize: 11 }}
          stroke="currentColor"
          className="text-slate-500 dark:text-slate-400"
          tickFormatter={(v: string) => v.slice(0, 3)}
        />
        <YAxis
          yAxisId="left"
          tickLine={false}
          axisLine={false}
          tick={{ fontSize: 11 }}
          stroke="currentColor"
          className="text-slate-500 dark:text-slate-400"
          tickFormatter={(v: number) => formatIDRCompact(v)}
          width={70}
        />
        <YAxis
          yAxisId="right"
          orientation="right"
          tickLine={false}
          axisLine={false}
          tick={{ fontSize: 11 }}
          stroke="currentColor"
          className="text-slate-500 dark:text-slate-400"
          tickFormatter={(v: number) => `${v.toFixed(0)}%`}
          width={45}
        />
        <Tooltip
          cursor={{ fill: "rgba(148,163,184,0.08)" }}
          content={({ active, payload, label }) => {
            if (!active || !payload || !payload.length) return null;
            const growthEntry = payload.find((p) => p.dataKey === "growth");
            const others = payload.filter((p) => p.dataKey !== "growth");
            const growth = growthEntry?.value as number | null | undefined;
            return (
              <div className="rounded-xl border border-slate-200 bg-white/95 px-3 py-2.5 text-xs shadow-card backdrop-blur-md dark:border-white/10 dark:bg-[#0f172a]/95">
                <div className="mb-1.5 font-semibold">{label}</div>
                <div className="space-y-1">
                  {others.map((p, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between gap-6"
                    >
                      <span className="flex items-center gap-1.5">
                        <span
                          className="h-2 w-2 rounded-full"
                          style={{ background: p.color }}
                        />
                        <span className="text-slate-600 dark:text-slate-300">
                          {p.name}
                        </span>
                      </span>
                      <span className="font-semibold tabular-nums">
                        {formatIDRCompact(p.value as number)}
                      </span>
                    </div>
                  ))}
                </div>
                {growth != null && (
                  <div className="mt-1.5 flex items-center justify-between gap-6 border-t border-slate-200 pt-1.5 dark:border-white/10">
                    <span className="text-slate-500 dark:text-slate-400">
                      YoY Growth
                    </span>
                    <span
                      className={
                        growth >= 0
                          ? "font-bold text-emerald-500"
                          : "font-bold text-rose-500"
                      }
                    >
                      {formatPercent(growth)}
                    </span>
                  </div>
                )}
              </div>
            );
          }}
        />
        <Legend
          wrapperStyle={{ fontSize: 12 }}
          iconType="circle"
          iconSize={8}
        />
        <Bar
          yAxisId="left"
          dataKey={String(prevYear)}
          name={String(prevYear)}
          fill="#94a3b8"
          radius={[4, 4, 0, 0]}
        />
        <Bar
          yAxisId="left"
          dataKey={String(primaryYear)}
          name={String(primaryYear)}
          fill="#28b955"
          radius={[4, 4, 0, 0]}
        />
        <Line
          yAxisId="right"
          type="monotone"
          dataKey="growth"
          name="YoY %"
          stroke="#f59e0b"
          strokeWidth={2.5}
          dot={{ r: 3, strokeWidth: 0, fill: "#f59e0b" }}
          activeDot={{ r: 5 }}
          connectNulls={false}
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
}

// silence unused import (kept for future use)
void ChartTooltip;
