import type { ReactNode } from "react";
import { CalendarRange, CalendarDays } from "lucide-react";

export type TabKey = "yearly" | "monthly";

interface TabsProps {
  active: TabKey;
  onChange: (k: TabKey) => void;
}

const TAB_DEFS: { key: TabKey; label: string; icon: ReactNode }[] = [
  {
    key: "yearly",
    label: "Analisa Tahunan",
    icon: <CalendarRange className="h-4 w-4" />,
  },
  {
    key: "monthly",
    label: "Analisa Bulanan",
    icon: <CalendarDays className="h-4 w-4" />,
  },
];

/**
 * Pill / segmented-control style tab bar — sits below the filter row inside
 * the sticky header. The active tab gets the brand gradient and a glow.
 */
export function Tabs({ active, onChange }: TabsProps) {
  return (
    <div
      role="tablist"
      aria-label="Mode analisa"
      className="inline-flex w-full max-w-md items-center gap-1 rounded-xl p-1 animate-fadeIn sm:w-auto"
      style={{
        background: "var(--bg-glass)",
        border: "1px solid var(--border-subtle)",
      }}
    >
      {TAB_DEFS.map((t) => {
        const isActive = active === t.key;
        return (
          <button
            key={t.key}
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(t.key)}
            className="flex flex-1 items-center justify-center gap-2 whitespace-nowrap rounded-lg px-4 py-2 text-sm font-semibold transition-all sm:flex-initial"
            style={{
              background: isActive ? "var(--grad-primary)" : "transparent",
              color: isActive ? "#fff" : "var(--text-muted)",
              boxShadow: isActive
                ? "0 4px 16px rgba(99, 102, 241, 0.35)"
                : "none",
              border: `1px solid ${
                isActive ? "rgba(255,255,255,0.15)" : "transparent"
              }`,
            }}
          >
            {t.icon}
            <span>{t.label}</span>
          </button>
        );
      })}
    </div>
  );
}
