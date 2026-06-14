import {
  ResponsiveContainer,
  AreaChart,
  Area,
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
import { ChartTooltip } from "./ChartTooltip";

interface Props {
  data: ParsedDataset;
  selectedYears: number[];
  selectedDepartments: Department[];
}

/**
 * Multi-year monthly trend (Grand Total per month, summed over selected
 * departments). Each year is rendered as a smooth area with subtle gradient.
 */
export function MonthlyTrendChart({
  data,
  selectedYears,
  selectedDepartments,
}: Props) {
  const useDeptFilter =
    selectedDepartments.length > 0 &&
    selectedDepartments.length < DEPARTMENTS.length;

  const rows = MONTHS_ID.map((m, idx) => {
    const r: Record<string, number | string | null> = { month: m };
    for (const y of selectedYears) {
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
        r[String(y)] = any ? s : null;
      } else {
        r[String(y)] = totalFor(data.pivot, y, idx);
      }
    }
    return r;
  });

  return (
    <ResponsiveContainer width="100%" height={320}>
      <AreaChart data={rows} margin={{ top: 10, right: 16, left: 0, bottom: 0 }}>
        <defs>
          {selectedYears.map((y, i) => {
            const color = YEAR_COLORS[i % YEAR_COLORS.length];
            return (
              <linearGradient
                key={y}
                id={`grad-year-${y}`}
                x1="0"
                y1="0"
                x2="0"
                y2="1"
              >
                <stop offset="0%" stopColor={color} stopOpacity={0.35} />
                <stop offset="100%" stopColor={color} stopOpacity={0} />
              </linearGradient>
            );
          })}
        </defs>
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
        <Tooltip content={<ChartTooltip showTotal={selectedYears.length > 1} />} />
        <Legend
          wrapperStyle={{ fontSize: 12 }}
          iconType="circle"
          iconSize={8}
        />
        {selectedYears.map((y, i) => {
          const color = YEAR_COLORS[i % YEAR_COLORS.length];
          return (
            <Area
              key={y}
              type="monotone"
              dataKey={String(y)}
              name={String(y)}
              stroke={color}
              strokeWidth={2.5}
              fill={`url(#grad-year-${y})`}
              activeDot={{ r: 5, strokeWidth: 2, stroke: "#fff" }}
              connectNulls={false}
            />
          );
        })}
      </AreaChart>
    </ResponsiveContainer>
  );
}
