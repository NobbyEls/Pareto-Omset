import {
  ResponsiveContainer,
  LineChart,
  Line,
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
} from "../../lib/csvParser";
import { CHART_COLORS } from "../../lib/theme";
import { ChartTooltip } from "./ChartTooltip";

interface Props {
  data: ParsedDataset;
  primaryYear: number;
  selectedDepartments: Department[];
}

/**
 * Department-by-department lines across the months of the primary year.
 * Useful for spotting outliers and seasonality patterns.
 */
export function DepartmentDeepDive({
  data,
  primaryYear,
  selectedDepartments,
}: Props) {
  const rows = MONTHS_ID.map((m, idx) => {
    const r: Record<string, number | string | null> = { month: m };
    for (const d of selectedDepartments) {
      const v = data.pivot[primaryYear]?.[idx]?.[d];
      r[d] = typeof v === "number" ? v : null;
    }
    return r;
  });

  return (
    <ResponsiveContainer width="100%" height={320}>
      <LineChart data={rows} margin={{ top: 10, right: 16, left: 0, bottom: 0 }}>
        <CartesianGrid
          strokeDasharray="3 3"
          stroke="currentColor"
          className="text-slate-200 dark:text-white/5"
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
          content={<ChartTooltip subtitle={`Tahun ${primaryYear}`} />}
        />
        <Legend
          wrapperStyle={{ fontSize: 12 }}
          iconType="circle"
          iconSize={8}
        />
        {selectedDepartments.map((d) => (
          <Line
            key={d}
            type="monotone"
            dataKey={d}
            name={d}
            stroke={CHART_COLORS[d as Department]}
            strokeWidth={2.5}
            dot={{ r: 3, strokeWidth: 0, fill: CHART_COLORS[d as Department] }}
            activeDot={{ r: 5 }}
            connectNulls={false}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}
