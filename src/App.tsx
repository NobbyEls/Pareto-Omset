import { useEffect, useMemo, useState } from "react";
import { Header } from "./components/Header";
import { Filters, type DeptFilter, type KotaFilter } from "./components/Filters";
import { KpiCards } from "./components/KpiCards";
import { SectionCard } from "./components/SectionCard";
import { DataTable } from "./components/DataTable";
import { YearlyMatrix } from "./components/YearlyMatrix";
import { BgDecoration } from "./components/BgDecoration";
import { KotaBreakdown } from "./components/KotaBreakdown";
import {
  EmptyState,
  ErrorState,
  LoadingState,
} from "./components/EmptyState";
import { MonthlyTrendChart } from "./components/charts/MonthlyTrendChart";
import { DepartmentDonut } from "./components/charts/DepartmentDonut";
import { DepartmentStackedBar } from "./components/charts/DepartmentStackedBar";
import { YoYChart } from "./components/charts/YoYChart";
import { DepartmentDeepDive } from "./components/charts/DepartmentDeepDive";
import { useDataset } from "./lib/dataset";
import {
  DEPARTMENTS,
  KOTA_NAMES,
  pivotForKota,
  type Department,
  type ParsedDataset,
} from "./lib/csvParser";

export default function App() {
  const { data, loading, error, fetchedAt, refresh } = useDataset();

  const [primaryYear, setPrimaryYear] = useState<number | null>(null);
  const [selectedKota, setSelectedKota] = useState<KotaFilter>("all");
  const [selectedDept, setSelectedDept] = useState<DeptFilter>("all");

  useEffect(() => {
    if (!data) return;
    if (data.years.length === 0) {
      setPrimaryYear(null);
      return;
    }
    setPrimaryYear((prev) => {
      if (prev != null && data.years.includes(prev)) return prev;
      return data.years[data.years.length - 1];
    });
  }, [data]);

  const hasData = !!data && data.records.length > 0;
  const ready = hasData && primaryYear != null;

  /**
   * View dataset: same shape as `data`, but `pivot` reflects the kota filter.
   * All chart / matrix components consume `viewData.pivot` so a single switch
   * here flows through the entire dashboard.
   */
  const viewData: ParsedDataset | null = useMemo(() => {
    if (!data) return null;
    return { ...data, pivot: pivotForKota(data, selectedKota) };
  }, [data, selectedKota]);

  /** Department list to feed downstream charts/matrices. */
  const visibleDepartments: Department[] = useMemo(
    () => (selectedDept === "all" ? [...DEPARTMENTS] : [selectedDept]),
    [selectedDept]
  );

  /** Trend chart compares primaryYear vs primaryYear-1 if available. */
  const trendYears = useMemo(() => {
    if (!ready || !viewData || primaryYear == null) return [];
    const prev = primaryYear - 1;
    const out = [primaryYear];
    if (viewData.years.includes(prev)) out.unshift(prev);
    return out;
  }, [ready, viewData, primaryYear]);

  const yoyAvailable = useMemo(
    () => ready && viewData!.years.includes((primaryYear as number) - 1),
    [ready, viewData, primaryYear]
  );

  const handleReset = () => {
    if (data && data.years.length > 0) {
      setPrimaryYear(data.years[data.years.length - 1]);
    }
    setSelectedKota("all");
    setSelectedDept("all");
  };

  const kotaLabel =
    selectedKota === "all" ? "Semua Kota" : KOTA_NAMES[selectedKota];

  return (
    <div className="relative min-h-screen">
      <BgDecoration />

      <div className="relative z-10">
        <Header loading={loading} fetchedAt={fetchedAt} onRefresh={refresh} />

        <main className="mx-auto max-w-[1500px] space-y-5 px-4 py-6 md:px-8 md:py-8">
          <div>
            <h2
              className="font-display text-xl font-bold tracking-tight md:text-2xl"
              style={{ color: "var(--text-primary)" }}
            >
              Analisa Omset
            </h2>
            <p className="text-sm" style={{ color: "var(--text-muted)" }}>
              Pantau performa bulanan dan tahunan dari spreadsheet yang
              ter-update otomatis setiap hari.
            </p>
          </div>

          {loading && !data && <LoadingState />}
          {!loading && error && <ErrorState message={error} />}
          {!loading && !error && data && data.records.length === 0 && (
            <EmptyState />
          )}

          {ready && viewData && data && primaryYear != null && (
            <>
              <Filters
                years={data.years}
                kotas={data.kotas}
                selectedYear={primaryYear}
                onYearChange={setPrimaryYear}
                selectedKota={selectedKota}
                onKotaChange={setSelectedKota}
                selectedDept={selectedDept}
                onDeptChange={setSelectedDept}
                onReset={handleReset}
              />

              <KpiCards
                data={viewData}
                primaryYear={primaryYear}
                selectedDepartments={visibleDepartments}
              />

              <SectionCard
                title={`Tren Bulanan • ${kotaLabel}`}
                description={
                  trendYears.length > 1
                    ? `Total omset per bulan • ${primaryYear} vs ${primaryYear - 1}`
                    : `Total omset per bulan • ${primaryYear}`
                }
                tag={{ label: "YoY · Trend", tone: "blue" }}
              >
                <MonthlyTrendChart
                  data={viewData}
                  selectedYears={trendYears}
                  selectedDepartments={visibleDepartments}
                />
              </SectionCard>

              <SectionCard
                title={`Matriks Bulanan ${primaryYear} • ${kotaLabel}`}
                description="Omset, MoM (Month-over-Month) & YoY (Year-over-Year) per departemen + total. MoM bulan Januari dihitung dari Desember tahun sebelumnya."
                tag={{ label: "Tahunan · Pivot", tone: "purple" }}
              >
                <YearlyMatrix data={viewData} year={primaryYear} />
              </SectionCard>

              <SectionCard
                title={`Performa per Kota • ${primaryYear}`}
                description="Total omset per cabang dengan share kontribusi dan YoY. Klik header untuk mengurutkan."
                tag={{ label: "Kota · Breakdown", tone: "amber" }}
              >
                <KotaBreakdown data={data} year={primaryYear} />
              </SectionCard>

              <div className="grid gap-5 xl:grid-cols-2">
                <SectionCard
                  title="Komposisi Departemen"
                  description={`Distribusi omset ${primaryYear} per departemen • ${kotaLabel}`}
                  tag={{ label: "Mix", tone: "pink" }}
                >
                  <DepartmentDonut
                    data={viewData}
                    primaryYear={primaryYear}
                    selectedDepartments={visibleDepartments}
                  />
                </SectionCard>

                <SectionCard
                  title="Stacked Bulanan per Departemen"
                  description={`Kontribusi tiap departemen tiap bulan • ${kotaLabel}`}
                  tag={{ label: "Stack", tone: "cyan" }}
                >
                  <DepartmentStackedBar
                    data={viewData}
                    primaryYear={primaryYear}
                    selectedDepartments={visibleDepartments}
                  />
                </SectionCard>
              </div>

              <SectionCard
                title="Performa Departemen"
                description={`Tren bulanan setiap departemen di ${primaryYear} • ${kotaLabel}`}
                tag={{ label: "Lines", tone: "purple" }}
              >
                <DepartmentDeepDive
                  data={viewData}
                  primaryYear={primaryYear}
                  selectedDepartments={visibleDepartments}
                />
              </SectionCard>

              {yoyAvailable && (
                <SectionCard
                  title={`Year-over-Year • ${primaryYear} vs ${primaryYear - 1}`}
                  description={`Bandingkan omset bulanan dan persentase pertumbuhan tahunan • ${kotaLabel}`}
                  tag={{ label: "YoY · Growth", tone: "green" }}
                >
                  <YoYChart
                    data={viewData}
                    primaryYear={primaryYear}
                    selectedDepartments={visibleDepartments}
                  />
                </SectionCard>
              )}

              <DataTable
                data={viewData}
                selectedYears={[primaryYear]}
                selectedDepartments={visibleDepartments}
              />

              <footer
                className="pt-2 pb-6 text-center text-xs"
                style={{ color: "var(--text-dim)" }}
              >
                <strong style={{ color: "var(--text-muted)" }}>
                  Pareto Omset
                </strong>
                {" · "}Live data dari Google Sheets{" · "}
                Crafted with React, Vite, Recharts &amp; Tailwind
              </footer>
            </>
          )}
        </main>
      </div>
    </div>
  );
}
