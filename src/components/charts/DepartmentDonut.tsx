import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
} from "recharts";
import {
  type Department,
  type ParsedDataset,
  DEPARTMENTS,
} from "../../lib/csvParser";
import { CHART_COLORS } from "../../lib/theme";
import { formatIDRCompact, formatIDR } from "../../lib/format";

interface Props {
  data: ParsedDataset;
  primaryYear: number;
  selectedDepartments: Department[];
}

export function DepartmentDonut({
  data,
  primaryYear,
  selectedDepartments,
}: Props) {
  const departments = selectedDepartments.length
    ? selectedDepartments
    : [...DEPARTMENTS];

  const totals = departments.map((d) => {
    let s = 0;
    for (let m = 0; m < 12; m++) {
      const v = data.pivot[primaryYear]?.[m]?.[d];
      if (typeof v === "number") s += v;
    }
    return { name: d, value: s };
  });
  const grand = totals.reduce((a, b) => a + b.value, 0);

  return (
    <div className="relative">
      <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          <Pie
            data={totals}
            innerRadius={70}
            outerRadius={110}
            paddingAngle={2}
            dataKey="value"
            stroke="none"
          >
            {totals.map((row) => (
              <Cell
                key={row.name}
                fill={CHART_COLORS[row.name as Department]}
              />
            ))}
          </Pie>
          <Tooltip
            wrapperStyle={{ zIndex: 50, pointerEvents: "none" }}
            offset={20}
            content={({ active, payload }) => {
              if (!active || !payload || !payload.length) return null;
              const p = payload[0];
              const value = Number(p.value) || 0;
              const pct = grand > 0 ? (value / grand) * 100 : 0;
              return (
                <div className="rounded-xl border border-slate-200 bg-white/95 px-3 py-2 text-xs shadow-card backdrop-blur-md dark:border-white/10 dark:bg-[#0f172a]/95">
                  <div className="font-semibold text-slate-800 dark:text-slate-100">
                    {p.name}
                  </div>
                  <div className="tabular-nums text-slate-600 dark:text-slate-300">
                    {formatIDR(value)}
                  </div>
                  <div className="text-slate-500 dark:text-slate-400">
                    {pct.toFixed(1)}% kontribusi
                  </div>
                </div>
              );
            }}
          />
          <Legend
            verticalAlign="bottom"
            wrapperStyle={{ fontSize: 12 }}
            iconType="circle"
            iconSize={8}
          />
        </PieChart>
      </ResponsiveContainer>
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center pb-10">
        <div className="text-[11px] uppercase tracking-wider text-slate-500 dark:text-slate-400">
          Total {primaryYear}
        </div>
        <div className="mt-0.5 text-xl font-bold tabular-nums">
          {formatIDRCompact(grand)}
        </div>
      </div>
    </div>
  );
}
