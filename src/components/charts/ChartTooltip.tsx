import type { TooltipProps } from "recharts";
import { formatIDR, formatIDRCompact } from "../../lib/format";

interface Props extends TooltipProps<number, string> {
  /** Optional secondary line shown under the title (e.g. year). */
  subtitle?: string;
  showTotal?: boolean;
}

export function ChartTooltip({
  active,
  payload,
  label,
  subtitle,
  showTotal,
}: Props) {
  if (!active || !payload || !payload.length) return null;

  const visible = payload.filter(
    (p) => p && (p.value as number) != null && p.dataKey !== "__total"
  );
  const total = visible.reduce((acc, p) => acc + (Number(p.value) || 0), 0);

  return (
    <div
      className="rounded-xl px-3 py-2.5 text-xs backdrop-blur-md"
      style={{
        background: "var(--bg-card)",
        border: "1px solid var(--border-medium)",
        boxShadow: "var(--shadow-card)",
        color: "var(--text-primary)",
        minWidth: 180,
      }}
    >
      <div className="mb-1.5 flex items-center justify-between gap-6">
        <span
          className="font-display font-semibold"
          style={{ color: "var(--text-primary)" }}
        >
          {label}
        </span>
        {subtitle && (
          <span
            className="text-[10px] uppercase tracking-wider"
            style={{ color: "var(--text-dim)" }}
          >
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
                style={{
                  background:
                    p.color || (p as { stroke?: string }).stroke || "#6366f1",
                }}
              />
              <span style={{ color: "var(--text-muted)" }}>{p.name}</span>
            </span>
            <span
              className="font-mono font-semibold tabular-nums"
              style={{ color: "var(--text-primary)" }}
            >
              {formatIDR(p.value as number)}
            </span>
          </div>
        ))}
      </div>
      {showTotal && visible.length > 1 && (
        <div
          className="mt-1.5 flex items-center justify-between gap-6 pt-1.5 text-[12px]"
          style={{ borderTop: "1px solid var(--border-subtle)" }}
        >
          <span style={{ color: "var(--text-dim)" }}>Total</span>
          <span
            className="font-mono font-bold tabular-nums"
            style={{ color: "var(--tint-share)" }}
          >
            {formatIDRCompact(total)}
          </span>
        </div>
      )}
    </div>
  );
}
