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

  const preFiltered = payload.filter(
    (p) => p && (p.value as number) != null && p.dataKey !== "__total"
  );

  // Deduplicate bridge-month: if both "YYYY" and "YYYY_est" have non-null values,
  // hide the _est entry to avoid showing a duplicate tooltip line.
  const visible = preFiltered.filter((p) => {
    const key = String(p.dataKey ?? "");
    if (key.endsWith("_est")) {
      const baseKey = key.replace("_est", "");
      const hasActual = preFiltered.some(
        (other) => String(other.dataKey ?? "") === baseKey && (other.value as number) != null
      );
      if (hasActual) return false;
    }
    return true;
  });
  const total = visible.reduce((acc, p) => acc + (Number(p.value) || 0), 0);

  // Detect which year keys are estimated by checking __estimated_YYYY flags in the row
  const rowData = payload[0]?.payload as Record<string, unknown> | undefined;

  /** Check if a given dataKey represents an estimated value */
  const isEstimatedEntry = (dataKey: string | undefined): boolean => {
    if (!dataKey || !rowData) return false;
    // For "_est" suffixed keys, check the __estimated flag for the base year
    if (dataKey.endsWith("_est")) {
      const baseYear = dataKey.replace("_est", "");
      return rowData[`__estimated_${baseYear}`] === true;
    }
    return false;
  };

  /** Get display name - append (Est) if the entry is estimated */
  const getDisplayName = (entry: (typeof visible)[number]): string => {
    const name = entry.name || String(entry.dataKey);
    if (isEstimatedEntry(entry.dataKey as string)) {
      // The name already has "(Est)" from the Area component
      return name;
    }
    return name;
  };

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
        {visible.map((p, i) => {
          const estimated = isEstimatedEntry(p.dataKey as string);
          return (
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
                    opacity: estimated ? 0.7 : 1,
                  }}
                />
                <span
                  style={{
                    color: "var(--text-muted)",
                    fontStyle: estimated ? "italic" : "normal",
                  }}
                >
                  {getDisplayName(p)}
                </span>
              </span>
              <span
                className="font-mono font-semibold tabular-nums"
                style={{
                  color: "var(--text-primary)",
                  opacity: estimated ? 0.8 : 1,
                }}
              >
                {formatIDR(p.value as number)}
              </span>
            </div>
          );
        })}
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
