import { useMemo } from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import { formatIDRCompact, MONTHS_ID } from "../../lib/format";
import {
  type Department,
  type ParsedDataset,
  totalFor,
  DEPARTMENTS,
} from "../../lib/csvParser";
import { YEAR_COLORS } from "../../lib/theme";
import { estimateValue } from "../../lib/estimation";
import { ChartTooltip } from "./ChartTooltip";

interface Props {
  data: ParsedDataset;
  selectedYears: number[];
  selectedDepartments: Department[];
  /** Changes when setDataDate() completes, forcing memo recalculation. */
  estimationKey: number;
}

/**
 * Grouped bar chart showing total revenue per month for each selected year
 * side-by-side (Year-over-Year comparison). Applies estimation for the
 * current running month.
 */
export function RevenueYoYBarChart({
  data,
  selectedYears,
  selectedDepartments,
  estimationKey,
}: Props) {
  const useDeptFilter =
    selectedDepartments.length > 0 &&
    selectedDepartments.length < DEPARTMENTS.length;

  const rows = useMemo(() => {
    return MONTHS_ID.map((m, idx) => {
      const r: Record<string, number | string | boolean | null> = { month: m };
      for (const y of selectedYears) {
        let raw: number | null;
        if (useDeptFilter) {
          let s = 0;
          let any = false;
          for (const d of selectedDepartments) {
            const v = data.pivot[y]?.[idx]?.[d];
            if (typeof v === "number") {
              s += v;
              any = true;
            }
          }
          raw = any ? s : null;
        } else {
          raw = totalFor(data.pivot, y, idx);
        }

        if (raw != null) {
          const est = estimateValue(raw, y, idx);
          r[String(y)] = est.value;
          if (est.isEstimated) {
            r[`__estimated_${y}`] = true;
          }
        } else {
          r[String(y)] = null;
        }
      }
      return r;
    });
  }, [data, selectedYears, selectedDepartments, useDeptFilter, estimationKey]);

  return (
    <ResponsiveContainer width="100%" height={320}>
      <BarChart
        data={rows}
        margin={{ top: 10, right: 16, left: 0, bottom: 0 }}
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
          tickLine={false}
          axisLine={false}
          tick={{ fontSize: 11 }}
          stroke="currentColor"
          className="text-slate-500 dark:text-slate-400"
          tickFormatter={(v: number) => formatIDRCompact(v)}
          width={70}
        />
        <Tooltip
          cursor={{ fill: "rgba(148,163,184,0.08)" }}
          content={<ChartTooltip showTotal={selectedYears.length > 1} />}
        />
        <Legend
          wrapperStyle={{ fontSize: 12 }}
          iconType="circle"
          iconSize={8}
          align="right"
          verticalAlign="top"
        />
        {selectedYears.map((y, i) => {
          const color = YEAR_COLORS[i % YEAR_COLORS.length];
          return (
            <Bar
              key={y}
              dataKey={String(y)}
              name={String(y)}
              fill={color}
              radius={[4, 4, 0, 0]}
            />
          );
        })}
      </BarChart>
    </ResponsiveContainer>
  );
}
