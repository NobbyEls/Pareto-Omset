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
  DEPARTMENTS,
} from "../../lib/csvParser";
import { CHART_COLORS } from "../../lib/theme";
import { ChartTooltip } from "./ChartTooltip";

interface Props {
  data: ParsedDataset;
  primaryYear: number;
  selectedDepartments: Department[];
}

/**
 * Per-month stacked bars showing the contribution of each department
 * (filtered by user) within the primary year.
 */
export function DepartmentStackedBar({
  data,
  primaryYear,
  selectedDepartments,
}: Props) {
  const departments = selectedDepartments.length
    ? selectedDepartments
    : [...DEPARTMENTS];

  const rows = MONTHS_ID.map((m, idx) => {
    const r: Record<string, number | string | null> = { month: m };
    for (const d of departments) {
      const v = data.pivot[primaryYear]?.[idx]?.[d];
      r[d] = typeof v === "number" ? v : 0;
    }
    return r;
  });

  return (
    <ResponsiveContainer width="100%" height={320}>
      <BarChart data={rows} margin={{ top: 10, right: 16, left: 0, bottom: 0 }}>
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
          content={<ChartTooltip subtitle={`Tahun ${primaryYear}`} showTotal />}
        />
        <Legend
          wrapperStyle={{ fontSize: 12 }}
          iconType="circle"
          iconSize={8}
        />
        {departments.map((d, i) => (
          <Bar
            key={d}
            dataKey={d}
            name={d}
            stackId="dept"
            fill={CHART_COLORS[d as Department]}
            radius={
              i === departments.length - 1 ? [6, 6, 0, 0] : [0, 0, 0, 0]
            }
          />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}
