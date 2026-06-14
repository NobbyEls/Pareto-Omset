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
  accent?: string;
}

function KpiCard({ icon, label, value, sublabel, trend, accent }: KpiProps) {
  const trendUp = trend != null && trend >= 0;
  return (
    <div className="kpi-card animate-fadeIn">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
          {label}
        </span>
        <div
          className={classNames(
            "grid h-9 w-9 place-items-center rounded-xl",
            accent ?? "bg-brand-500/10 text-brand-600 dark:text-brand-400"
          )}
        >
          {icon}
        </div>
      </div>
      <div className="mt-3 text-2xl font-bold tracking-tight md:text-[28px]">
        {value}
      </div>
      <div className="mt-1 flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
        {trend != null && (
          <span
            className={classNames(
              "inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 font-semibold",
              trendUp
                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                : "bg-rose-500/10 text-rose-600 dark:text-rose-400"
            )}
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

  // Best month (by Grand Total) for primary year
  let bestMonthIdx = -1;
  let bestMonthVal = -1;
  for (let i = 0; i < 12; i++) {
    const v = totalFor(data.pivot, primaryYear, i);
    if (v != null && v > bestMonthVal) {
      bestMonthVal = v;
      bestMonthIdx = i;
    }
  }

  // Top department for the year (across selected departments)
  const deptTotals: Record<Department, number> = {
    NB: 0,
    PC: 0,
    JASA: 0,
  };
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

  // Avg per active month
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
        accent="bg-brand-500/10 text-brand-600 dark:text-brand-400"
      />
      <KpiCard
        icon={<CalendarDays className="h-5 w-5" />}
        label={`Rata-rata / Bulan`}
        value={formatIDRCompact(avgPerMonth)}
        sublabel={`Dari ${activeMonths} bulan aktif`}
        accent="bg-sky-500/10 text-sky-600 dark:text-sky-400"
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
        accent="bg-amber-500/10 text-amber-600 dark:text-amber-400"
      />
      <KpiCard
        icon={<Crown className="h-5 w-5" />}
        label="Departemen Teratas"
        value={topDept}
        sublabel={`${formatIDRCompact(topDeptVal)} • ${topDeptShare.toFixed(
          1
        )}% kontribusi`}
        accent="bg-purple-500/10 text-purple-600 dark:text-purple-400"
      />
    </div>
  );
}
