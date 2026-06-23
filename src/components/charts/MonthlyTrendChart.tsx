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
import { estimateValue } from "../../lib/estimation";
import { ChartTooltip } from "./ChartTooltip";

interface Props {
  data: ParsedDataset;
  selectedYears: number[];
  selectedDepartments: Department[];
}

/**
 * Multi-year monthly trend (Grand Total per month, summed over selected
 * departments). Each year is rendered as a smooth area with subtle gradient.
 * The current month is shown as estimated with dashed stroke and lower opacity.
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
        if (est.isEstimated) {
          // Put the estimated value in a separate key for dashed rendering
          r[String(y)] = null;
          r[`${y}_est`] = est.value;
          r[`__estimated_${y}`] = true;
        } else {
          r[String(y)] = raw;
          r[`${y}_est`] = null;
        }
      } else {
        r[String(y)] = null;
        r[`${y}_est`] = null;
      }
    }
    return r;
  });

  // For the estimated segment to connect visually, include the previous month's value
  // in the est series as a bridge point — only for years that actually have estimation.
  for (let i = 1; i < rows.length; i++) {
    for (const y of selectedYears) {
      if (rows[i][`__estimated_${y}`]) {
        // Copy previous month's value into the est series as a start point
        const prevVal = rows[i - 1][String(y)];
        if (prevVal != null) {
          rows[i - 1][`${y}_est`] = prevVal;
        }
      }
    }
  }

  // Determine which years have estimation (for conditional rendering)
  const yearsWithEstimation = new Set(
    selectedYears.filter((y) => rows.some((r) => r[`__estimated_${y}`] === true))
  );

  return (
    <ResponsiveContainer width="100%" height={320}>
      <AreaChart data={rows} margin={{ top: 10, right: 16, left: 0, bottom: 0 }}>
        <defs>
          {selectedYears.map((y, i) => {
            const color = YEAR_COLORS[i % YEAR_COLORS.length];
            return [
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
              </linearGradient>,
              <linearGradient
                key={`${y}-est`}
                id={`grad-year-${y}-est`}
                x1="0"
                y1="0"
                x2="0"
                y2="1"
              >
                <stop offset="0%" stopColor={color} stopOpacity={0.15} />
                <stop offset="100%" stopColor={color} stopOpacity={0} />
              </linearGradient>,
            ];
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
        {selectedYears.flatMap((y, i) => {
          const color = YEAR_COLORS[i % YEAR_COLORS.length];
          // Only render the _est Area if this year actually has estimated data
          const hasEstData = yearsWithEstimation.has(y);
          const areas = [
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
            />,
          ];
          if (hasEstData) {
            areas.push(
              <Area
                key={`${y}-est`}
                type="monotone"
                dataKey={`${y}_est`}
                name={`${y} (Est)`}
                stroke={color}
                strokeWidth={2.5}
                strokeDasharray="5 5"
                fill={`url(#grad-year-${y}-est)`}
                activeDot={{ r: 5, strokeWidth: 2, stroke: "#fff" }}
                connectNulls={false}
                legendType="none"
              />
            );
          }
          return areas;
        })}
      </AreaChart>
    </ResponsiveContainer>
  );
}
