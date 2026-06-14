import type { TooltipProps } from "recharts";
import { formatIDR, formatIDRCompact } from "../../lib/format";

interface Props extends TooltipProps<number, string> {
  /** Optional secondary line shown under the title (e.g. year). */
  subtitle?: string;
  showTotal?: boolean;
}

export function ChartTooltip({ active, payload, label, subtitle, showTotal }: Props) {
  if (!active || !payload || !payload.length) return null;

  const visible = payload.filter(
    (p) => p && (p.value as number) != null && p.dataKey !== "__total"
  );
  const total = visible.reduce((acc, p) => acc + (Number(p.value) || 0), 0);

  return (
    <div className="rounded-xl border border-slate-200 bg-white/95 px-3 py-2.5 text-xs shadow-card backdrop-blur-md dark:border-white/10 dark:bg-[#0f172a]/95">
      <div className="mb-1.5 flex items-center justify-between gap-6">
        <span className="font-semibold text-slate-800 dark:text-slate-100">
          {label}
        </span>
        {subtitle && (
          <span className="text-[10px] uppercase tracking-wider text-slate-400">
            {subtitle}
          </span>
        )}
      </div>
      <div className="space-y-1">
        {visible.map((p, i) => (
          <div
            key={i}
            className="flex items-center justify-between gap-6 text-[12px]"
          >
            <span className="flex items-center gap-1.5">
              <span
                className="inline-block h-2 w-2 rounded-full"
                style={{ background: p.color || (p as { stroke?: string }).stroke }}
              />
              <span className="text-slate-600 dark:text-slate-300">
                {p.name}
              </span>
            </span>
            <span className="font-semibold tabular-nums text-slate-800 dark:text-slate-100">
              {formatIDR(p.value as number)}
            </span>
          </div>
        ))}
      </div>
      {showTotal && visible.length > 1 && (
        <div className="mt-1.5 flex items-center justify-between gap-6 border-t border-slate-200 pt-1.5 text-[12px] dark:border-white/10">
          <span className="text-slate-500 dark:text-slate-400">Total</span>
          <span className="font-bold tabular-nums">
            {formatIDRCompact(total)}
          </span>
        </div>
      )}
    </div>
  );
}
