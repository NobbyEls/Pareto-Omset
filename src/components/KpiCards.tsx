import {
  TrendingUp,
  TrendingDown,
  Wallet,
  Trophy,
  Crown,
  CalendarDays,
} from "lucide-react";
import {
  formatIDR,
  formatIDRCompact,
  formatPercent,
  MONTHS_ID,
  classNames,
} from "../lib/format";
import {
  type Department,
  type ParsedDataset,
  totalForYear,
  totalFor,
  DEPARTMENTS,
} from "../lib/csvParser";

interface KpiCardsProps {
  data: ParsedDataset;
  primaryYear: number;
  selectedDepartments: Department[];
}

interface KpiProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  sublabel?: string;
  trend?: number | null;
  /** Tailwind-style gradient string for the icon backdrop. */
  gradient: string;
}

function KpiCard({ icon, label, value, sublabel, trend, gradient }: KpiProps) {
  const trendUp = trend != null && trend >= 0;
  return (
    <div className="kpi-card animate-fadeIn">
      <div className="flex items-center justify-between">
        <span
          className="text-xs font-medium uppercase tracking-wider"
          style={{ color: "var(--text-dim)" }}
        >
          {label}
        </span>
        <div
          className="grid h-10 w-10 place-items-center rounded-xl text-white"
          style={{
            background: gradient,
            boxShadow: "0 0 25px rgba(99,102,241,0.25)",
          }}
        >
          {icon}
        </div>
      </div>
      <div
        className="mt-3 font-display text-2xl font-bold tracking-tight md:text-[28px]"
        style={{ color: "var(--text-primary)" }}
      >
        {value}
      </div>
      <div
        className="mt-1 flex flex-wrap items-center gap-2 text-xs"
        style={{ color: "var(--text-muted)" }}
      >
        {trend != null && (
          <span
            className={classNames(
              "inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 font-semibold"
            )}
            style={{
              background: trendUp
                ? "rgba(16, 185, 129, 0.15)"
                : "rgba(244, 63, 94, 0.15)",
              color: trendUp ? "#34d399" : "#fb7185",
              border: `1px solid ${trendUp ? "rgba(16, 185, 129, 0.3)" : "rgba(244, 63, 94, 0.3)"}`,
            }}
          >
            {trendUp ? (
              <TrendingUp className="h-3 w-3" />
            ) : (
              <TrendingDown className="h-3 w-3" />
            )}
            {formatPercent(trend)}
          </span>
        )}
        {sublabel && <span className="truncate">{sublabel}</span>}
      </div>
    </div>
  );
}

export function KpiCards({
  data,
  primaryYear,
  selectedDepartments,
}: KpiCardsProps) {
  const totalThisYear = totalForYear(data.pivot, primaryYear);
  const prevYear = primaryYear - 1;
  const totalPrevYear = data.years.includes(prevYear)
    ? totalForYear(data.pivot, prevYear)
    : 0;
  const yoy =
    totalPrevYear > 0
      ? ((totalThisYear - totalPrevYear) / totalPrevYear) * 100
      : null;

  let bestMonthIdx = -1;
  let bestMonthVal = -1;
  for (let i = 0; i < 12; i++) {
    const v = totalFor(data.pivot, primaryYear, i);
    if (v != null && v > bestMonthVal) {
      bestMonthVal = v;
      bestMonthIdx = i;
    }
  }

  const deptTotals: Record<Department, number> = { NB: 0, PC: 0, JASA: 0 };
  for (let i = 0; i < 12; i++) {
    const m = data.pivot[primaryYear]?.[i];
    if (!m) continue;
    for (const d of DEPARTMENTS) {
      const v = m[d];
      if (typeof v === "number") deptTotals[d] += v;
    }
  }
  const visibleDepts = selectedDepartments.length
    ? selectedDepartments
    : [...DEPARTMENTS];
  let topDept: Department = visibleDepts[0];
  let topDeptVal = -1;
  for (const d of visibleDepts) {
    if (deptTotals[d] > topDeptVal) {
      topDeptVal = deptTotals[d];
      topDept = d;
    }
  }
  const sumDeptsVisible = visibleDepts.reduce(
    (acc, d) => acc + deptTotals[d],
    0
  );
  const topDeptShare =
    sumDeptsVisible > 0 ? (topDeptVal / sumDeptsVisible) * 100 : 0;

  let activeMonths = 0;
  for (let i = 0; i < 12; i++) {
    if (totalFor(data.pivot, primaryYear, i) != null) activeMonths++;
  }
  const avgPerMonth = activeMonths > 0 ? totalThisYear / activeMonths : 0;

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <KpiCard
        icon={<Wallet className="h-5 w-5" />}
        label={`Total Omset ${primaryYear}`}
        value={formatIDRCompact(totalThisYear)}
        sublabel={formatIDR(totalThisYear)}
        trend={yoy}
        gradient="linear-gradient(135deg, #6366f1 0%, #ec4899 100%)"
      />
      <KpiCard
        icon={<CalendarDays className="h-5 w-5" />}
        label="Rata-rata / Bulan"
        value={formatIDRCompact(avgPerMonth)}
        sublabel={`Dari ${activeMonths} bulan aktif`}
        gradient="linear-gradient(135deg, #06b6d4 0%, #6366f1 100%)"
      />
      <KpiCard
        icon={<Trophy className="h-5 w-5" />}
        label="Bulan Terbaik"
        value={bestMonthIdx >= 0 ? MONTHS_ID[bestMonthIdx] : "—"}
        sublabel={
          bestMonthIdx >= 0
            ? `${formatIDRCompact(bestMonthVal)} omset`
            : "Belum ada data"
        }
        gradient="linear-gradient(135deg, #f59e0b 0%, #ec4899 100%)"
      />
      <KpiCard
        icon={<Crown className="h-5 w-5" />}
        label="Departemen Teratas"
        value={topDept}
        sublabel={`${formatIDRCompact(topDeptVal)} • ${topDeptShare.toFixed(1)}% kontribusi`}
        gradient="linear-gradient(135deg, #a855f7 0%, #06b6d4 100%)"
      />
    </div>
  );
}
