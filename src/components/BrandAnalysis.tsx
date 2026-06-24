import { useEffect, useMemo, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { BrandFilters } from "./BrandFilters";
import { SectionCard } from "./SectionCard";
import {
  EmptyState,
  ErrorState,
  LoadingState,
} from "./EmptyState";
import type { BrandDatasetState } from "../lib/brandDataset";
import { MONTHS_ID, formatIDRCompact, formatIDR, formatNumber } from "../lib/format";
import type { BrandRecord } from "../lib/brandParser";

const BAR_COLORS = [
  "#28b955",
  "#0ea5e9",
  "#a855f7",
  "#f59e0b",
  "#ef4444",
  "#10b981",
  "#6366f1",
  "#ec4899",
  "#14b8a6",
  "#f97316",
];

interface AggregatedBrand {
  brand: string;
  totalOmset: number;
  percentage: number;
  cumulativePercentage: number;
}

function CustomTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload as AggregatedBrand;
  return (
    <div className="rounded-xl border border-slate-200 bg-white/95 px-3 py-2 text-xs shadow-lg backdrop-blur dark:border-white/10 dark:bg-slate-800/95">
      <p className="font-semibold text-slate-800 dark:text-slate-100">
        {d.brand}
      </p>
      <p className="mt-1 text-slate-600 dark:text-slate-300">
        Omset: {formatIDR(d.totalOmset)}
      </p>
      <p className="text-slate-600 dark:text-slate-300">
        Kontribusi: {d.percentage.toFixed(2)}%
      </p>
      <p className="text-slate-600 dark:text-slate-300">
        Kumulatif: {d.cumulativePercentage.toFixed(2)}%
      </p>
    </div>
  );
}

export function BrandAnalysis({ brandState }: { brandState: BrandDatasetState }) {
  const { data, loading, error } = brandState;

  const [selectedYear, setSelectedYear] = useState<number>(2026);
  const [startMonth, setStartMonth] = useState(0);
  const [endMonth, setEndMonth] = useState(5);
  const [selectedDepartment, setSelectedDepartment] = useState("__all__");

  // Initialize year from data
  useEffect(() => {
    if (!data || data.years.length === 0) return;
    setSelectedYear((prev) => {
      if (data.years.includes(prev)) return prev;
      return data.years[data.years.length - 1];
    });
  }, [data]);

  // Adjust endMonth when startMonth changes
  useEffect(() => {
    if (endMonth < startMonth) {
      setEndMonth(startMonth);
    }
  }, [startMonth, endMonth]);

  // Compute aggregated brand data
  const aggregated = useMemo<AggregatedBrand[]>(() => {
    if (!data) return [];

    const filtered = data.records.filter((r: BrandRecord) => {
      if (r.year !== selectedYear) return false;
      if (r.monthIndex < startMonth || r.monthIndex > endMonth) return false;
      if (selectedDepartment !== "__all__" && r.department !== selectedDepartment)
        return false;
      return true;
    });

    // Group by brand
    const brandMap = new Map<string, number>();
    for (const r of filtered) {
      const current = brandMap.get(r.brand) || 0;
      brandMap.set(r.brand, current + r.omset);
    }

    // Sort descending by total omset
    const sorted = Array.from(brandMap.entries())
      .filter(([, v]) => v > 0)
      .sort((a, b) => b[1] - a[1]);

    const grandTotal = sorted.reduce((sum, [, v]) => sum + v, 0);

    let cumulative = 0;
    return sorted.map(([brand, totalOmset]) => {
      const pct = grandTotal > 0 ? (totalOmset / grandTotal) * 100 : 0;
      cumulative += pct;
      return {
        brand,
        totalOmset,
        percentage: pct,
        cumulativePercentage: cumulative,
      };
    });
  }, [data, selectedYear, startMonth, endMonth, selectedDepartment]);

  // Summary stats
  const totalOmset = useMemo(
    () => aggregated.reduce((s, b) => s + b.totalOmset, 0),
    [aggregated]
  );
  const totalBrands = aggregated.length;
  const top5Pct = useMemo(
    () =>
      aggregated.length >= 5 ? aggregated[4].cumulativePercentage : 100,
    [aggregated]
  );

  // Chart data (top 20 for the bar chart)
  const chartData = useMemo(() => aggregated.slice(0, 20), [aggregated]);

  const periodLabel = useMemo(() => {
    if (startMonth === endMonth) return MONTHS_ID[startMonth];
    return `${MONTHS_ID[startMonth]} - ${MONTHS_ID[endMonth]}`;
  }, [startMonth, endMonth]);

  if (loading && !data) return <LoadingState />;
  if (!loading && error) return <ErrorState message={error} />;
  if (!loading && !error && data && data.records.length === 0)
    return <EmptyState />;
  if (!data) return null;

  return (
    <div className="space-y-5">
      <BrandFilters
        years={data.years}
        selectedYear={selectedYear}
        onYearChange={setSelectedYear}
        startMonth={startMonth}
        endMonth={endMonth}
        onStartMonthChange={setStartMonth}
        onEndMonthChange={setEndMonth}
        departments={data.departments}
        selectedDepartment={selectedDepartment}
        onDepartmentChange={setSelectedDepartment}
      />

      {/* KPI summary */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="kpi-card">
          <p className="text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Total Omset
          </p>
          <p className="mt-1 text-xl font-bold tracking-tight text-brand-600 dark:text-brand-400">
            {formatIDRCompact(totalOmset)}
          </p>
          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
            {periodLabel} {selectedYear}
          </p>
        </div>
        <div className="kpi-card">
          <p className="text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Jumlah Brand
          </p>
          <p className="mt-1 text-xl font-bold tracking-tight">
            {formatNumber(totalBrands)}
          </p>
          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
            brand aktif dalam periode
          </p>
        </div>
        <div className="kpi-card">
          <p className="text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Top 5 Kontribusi
          </p>
          <p className="mt-1 text-xl font-bold tracking-tight">
            {top5Pct.toFixed(1)}%
          </p>
          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
            dari total omset
          </p>
        </div>
      </div>

      {/* Horizontal bar chart - Top 20 */}
      <SectionCard
        title={`Top 20 Brand - Kontribusi Omset`}
        description={`Peringkat brand berdasarkan total omset ${periodLabel} ${selectedYear}${selectedDepartment !== "__all__" ? ` (${selectedDepartment})` : ""}`}
      >
        <div style={{ width: "100%", height: Math.max(400, chartData.length * 32) }}>
          <ResponsiveContainer>
            <BarChart
              data={chartData}
              layout="vertical"
              margin={{ top: 5, right: 30, left: 5, bottom: 5 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                horizontal={false}
                stroke="currentColor"
                className="text-slate-200 dark:text-white/10"
              />
              <XAxis
                type="number"
                tickFormatter={(v: number) => formatIDRCompact(v)}
                tick={{ fontSize: 11 }}
                className="text-slate-500 dark:text-slate-400"
              />
              <YAxis
                type="category"
                dataKey="brand"
                width={120}
                tick={{ fontSize: 11 }}
                className="text-slate-600 dark:text-slate-300"
              />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="totalOmset" radius={[0, 6, 6, 0]} maxBarSize={24}>
                {chartData.map((_, idx) => (
                  <Cell
                    key={idx}
                    fill={BAR_COLORS[idx % BAR_COLORS.length]}
                    fillOpacity={0.85}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </SectionCard>

      {/* Full ranking table */}
      <SectionCard
        title="Ranking Lengkap Brand"
        description={`Semua brand diurutkan dari kontribusi tertinggi | ${periodLabel} ${selectedYear}`}
      >
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-xs font-medium uppercase tracking-wider text-slate-500 dark:border-white/10 dark:text-slate-400">
                <th className="px-3 py-2 w-12">#</th>
                <th className="px-3 py-2">Brand</th>
                <th className="px-3 py-2 text-right">Total Omset</th>
                <th className="px-3 py-2 text-right">Kontribusi</th>
                <th className="px-3 py-2 text-right">Kumulatif</th>
                <th className="px-3 py-2 w-32">Pareto</th>
              </tr>
            </thead>
            <tbody>
              {aggregated.map((item, idx) => (
                <tr
                  key={item.brand}
                  className="border-b border-slate-100 transition hover:bg-slate-50 dark:border-white/5 dark:hover:bg-white/[0.02]"
                >
                  <td className="px-3 py-2 font-medium text-slate-500 dark:text-slate-400">
                    {idx + 1}
                  </td>
                  <td className="px-3 py-2 font-medium">{item.brand}</td>
                  <td className="px-3 py-2 text-right font-mono text-xs">
                    {formatIDR(item.totalOmset)}
                  </td>
                  <td className="px-3 py-2 text-right font-mono text-xs">
                    {item.percentage.toFixed(2)}%
                  </td>
                  <td className="px-3 py-2 text-right font-mono text-xs">
                    {item.cumulativePercentage.toFixed(2)}%
                  </td>
                  <td className="px-3 py-2">
                    <div className="h-2 w-full rounded-full bg-slate-100 dark:bg-white/10">
                      <div
                        className="h-2 rounded-full bg-brand-500 transition-all"
                        style={{
                          width: `${Math.min(item.cumulativePercentage, 100)}%`,
                        }}
                      />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {aggregated.length === 0 && (
            <p className="py-8 text-center text-sm text-slate-400">
              Tidak ada data untuk filter yang dipilih.
            </p>
          )}
        </div>
      </SectionCard>
    </div>
  );
}
