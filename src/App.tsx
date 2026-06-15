import { useEffect, useMemo, useState } from "react";
import { Header } from "./components/Header";
import { Filters, type DeptFilter, type KotaFilter, type YearFilter } from "./components/Filters";
import { KpiCards } from "./components/KpiCards";
import { SectionCard } from "./components/SectionCard";
import { DataTable } from "./components/DataTable";
import { YearlyMatrix } from "./components/YearlyMatrix";
import { BgDecoration } from "./components/BgDecoration";
import { KotaBreakdown } from "./components/KotaBreakdown";
import { JasaBreakdown } from "./components/JasaBreakdown";
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
  const { data, loading, refreshing, error, fetchedAt, fromCache, isStale, updateData } = useDataset();

  const [primaryYear, setPrimaryYear] = useState<YearFilter>("all");
  const [selectedKota, setSelectedKota] = useState<KotaFilter>("all");
  const [selectedDept, setSelectedDept] = useState<DeptFilter>("all");

  useEffect(() => {
    if (!data) return;
    if (data.years.length === 0) {
      setPrimaryYear("all");
      return;
    }
    // Keep current selection valid; default to "all".
    setPrimaryYear((prev) => {
      if (prev === "all") return "all";
      if (data.years.includes(prev)) return prev;
      return "all";
    });
  }, [data]);

  const hasData = !!data && data.records.length > 0;
  const ready = hasData && primaryYear != null;

  /** The actual numeric year used for matrix/KPI. When "all", use latest. */
  const matrixYear: number | null = useMemo(() => {
    if (!data || data.years.length === 0) return null;
    if (primaryYear === "all") return data.years[data.years.length - 1];
    return primaryYear;
  }, [data, primaryYear]);

  /**
   * View dataset: same shape as `data`, but `pivot` reflects the kota filter.
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

  /** Trend chart years: when "all", overlay every year in the dataset. */
  const trendYears = useMemo(() => {
    if (!ready || !viewData) return [];
    if (primaryYear === "all") return [...viewData.years];
    const prev = primaryYear - 1;
    const out = [primaryYear];
    if (viewData.years.includes(prev)) out.unshift(prev);
    return out;
  }, [ready, viewData, primaryYear]);

  const yoyAvailable = useMemo(
    () =>
      ready &&
      matrixYear != null &&
      viewData!.years.includes(matrixYear - 1),
    [ready, viewData, matrixYear]
  );

  const handleReset = () => {
    setPrimaryYear("all");
    setSelectedKota("all");
    setSelectedDept("all");
  };

  const kotaLabel =
    selectedKota === "all" ? "Semua Kota" : KOTA_NAMES[selectedKota];

  return (
    <div className="relative min-h-screen">
      <BgDecoration />

      <div className="relative z-10">
        <Header loading={loading} refreshing={refreshing} fetchedAt={fetchedAt} fromCache={fromCache} isStale={isStale} onUpdateData={updateData}>
          {ready && data && (
            <Filters
              years={data.years}
              kotas={data.kotas}
              selectedYear={primaryYear}
              onYearChange={(v) => setPrimaryYear(v)}
              selectedKota={selectedKota}
              onKotaChange={setSelectedKota}
              selectedDept={selectedDept}
              onDeptChange={setSelectedDept}
              onReset={handleReset}
            />
          )}
        </Header>

        <main className="mx-auto max-w-[1500px] space-y-5 px-4 py-6 md:px-8 md:py-8">
          {loading && !data && <LoadingState />}
          {!loading && error && <ErrorState message={error} />}
          {!loading && !error && data && data.records.length === 0 && (
            <EmptyState />
          )}

          {ready && viewData && data && matrixYear != null && (
            <>
              <KpiCards
                data={viewData}
                primaryYear={matrixYear}
                selectedDepartments={visibleDepartments}
              />

              <SectionCard
                title={`Tren Bulanan • ${kotaLabel}`}
                description={
                  trendYears.length > 1
                    ? `Total omset per bulan • ${trendYears.join(" vs ")}`
                    : `Total omset per bulan • ${matrixYear}`
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
                title={`Matriks Bulanan ${matrixYear} • ${kotaLabel}`}
                description="Omset, MoM (Month-over-Month) & YoY (Year-over-Year) per departemen + total. MoM bulan Januari dihitung dari Desember tahun sebelumnya."
                tag={{ label: "Tahunan · Pivot", tone: "purple" }}
              >
                <YearlyMatrix data={viewData} year={matrixYear} />
              </SectionCard>

              <SectionCard
                title={`Performa per Kota • ${matrixYear}`}
                description="Total omset per cabang dengan share kontribusi dan YoY. Klik header untuk mengurutkan."
                tag={{ label: "Kota · Breakdown", tone: "amber" }}
              >
                <KotaBreakdown data={data} year={matrixYear} />
              </SectionCard>

              <JasaBreakdown />

              <div className="grid gap-5 xl:grid-cols-2">
                <SectionCard
                  title="Komposisi Departemen"
                  description={`Distribusi omset ${matrixYear} per departemen • ${kotaLabel}`}
                  tag={{ label: "Mix", tone: "pink" }}
                >
                  <DepartmentDonut
                    data={viewData}
                    primaryYear={matrixYear}
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
                    primaryYear={matrixYear}
                    selectedDepartments={visibleDepartments}
                  />
                </SectionCard>
              </div>

              <SectionCard
                title="Performa Departemen"
                description={`Tren bulanan setiap departemen di ${matrixYear} • ${kotaLabel}`}
                tag={{ label: "Lines", tone: "purple" }}
              >
                <DepartmentDeepDive
                  data={viewData}
                  primaryYear={matrixYear}
                  selectedDepartments={visibleDepartments}
                />
              </SectionCard>

              {yoyAvailable && (
                <SectionCard
                  title={`Year-over-Year • ${matrixYear} vs ${matrixYear - 1}`}
                  description={`Bandingkan omset bulanan dan persentase pertumbuhan tahunan • ${kotaLabel}`}
                  tag={{ label: "YoY · Growth", tone: "green" }}
                >
                  <YoYChart
                    data={viewData}
                    primaryYear={matrixYear}
                    selectedDepartments={visibleDepartments}
                  />
                </SectionCard>
              )}

              <DataTable
                data={viewData}
                selectedYears={primaryYear === "all" ? data.years : [primaryYear]}
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
