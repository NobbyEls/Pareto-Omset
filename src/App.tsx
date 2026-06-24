import { useEffect, useMemo, useState } from "react";
import { Header } from "./components/Header";
import { Filters, type DeptFilter, type KotaFilter, type YearFilter } from "./components/Filters";
import { Tabs, type TabKey } from "./components/Tabs";
import { SectionCard } from "./components/SectionCard";
import { DataTable } from "./components/DataTable";
import { YearlyMatrix } from "./components/YearlyMatrix";
import { JasaMatrix } from "./components/JasaMatrix";
import { BgDecoration } from "./components/BgDecoration";
import { KotaBreakdown } from "./components/KotaBreakdown";
import { JasaBreakdown } from "./components/JasaBreakdown";
import { MonthlyAnalysis } from "./components/MonthlyAnalysis";
import {
  EmptyState,
  ErrorState,
} from "./components/EmptyState";
import { LoadingOverlay } from "./components/LoadingOverlay";
import { MonthlyTrendChart } from "./components/charts/MonthlyTrendChart";
import { DepartmentDonut } from "./components/charts/DepartmentDonut";
import { DepartmentStackedBar } from "./components/charts/DepartmentStackedBar";
import { RevenueYoYBarChart } from "./components/charts/RevenueYoYBarChart";
import { DepartmentDeepDive } from "./components/charts/DepartmentDeepDive";
import { BrandAnalysis } from "./components/BrandAnalysis";
import { BrandFilters } from "./components/BrandFilters";
import { useDataset } from "./lib/dataset";
import { useJasaDataset } from "./lib/jasaDataset";
import { useBrandDataset } from "./lib/brandDataset";
import {
  DEPARTMENTS,
  KOTA_NAMES,
  pivotForKota,
  type Department,
  type KotaCode,
  type ParsedDataset,
} from "./lib/csvParser";

export default function App() {
  const { data, loading, refreshing, error, fetchedAt, fromCache, isStale, updateData } = useDataset();
  // Lift Jasa dataset to App level so setDataDate() is called as early as
  // possible -- before estimation-dependent components first render.
  const jasaState = useJasaDataset();
  // Lift Brand dataset to App level so data is fetched immediately on app load,
  // not lazily when user switches to the brand tab.
  const brandState = useBrandDataset();

  // When jasaState.data transitions from null to non-null, parseJasaCSV has
  // run and setDataDate() was called. Components that use estimateValue() need
  // to re-run their memos. This key flips 0->1 to invalidate those memos.
  const estimationKey = jasaState.data ? 1 : 0;

  const [primaryYear, setPrimaryYear] = useState<YearFilter>("all");
  const [selectedKota, setSelectedKota] = useState<KotaFilter>("all");
  const [selectedDept, setSelectedDept] = useState<DeptFilter>("all");
  const [activeTab, setActiveTab] = useState<TabKey>("yearly");
  const [selectedMonth, setSelectedMonth] = useState<number>(-1);

  // Brand tab filter state (lifted here so BrandFilters can render in Header)
  const [brandYear, setBrandYear] = useState<number>(2026);
  const [brandStartMonth, setBrandStartMonth] = useState(0);
  const [brandEndMonth, setBrandEndMonth] = useState(11);
  const [brandDepartments, setBrandDepartments] = useState<string[]>([]);

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

  // Initialize brand filter defaults from brand dataset
  useEffect(() => {
    if (!brandState.data) return;
    if (brandState.data.years.length > 0) {
      setBrandYear((prev) => brandState.data!.years.includes(prev) ? prev : brandState.data!.years[brandState.data!.years.length - 1]);
    }
    if (brandDepartments.length === 0) {
      setBrandDepartments(brandState.data.departments);
    }
  }, [brandState.data]);

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

  /** Visible kotas based on the global kota filter. */
  const visibleKotas: KotaCode[] = useMemo(
    () => (data ? (selectedKota === "all" ? data.kotas : [selectedKota]) : []),
    [data, selectedKota]
  );

  /** Available months for the monthly tab (months that have data for current filters). */
  const availableMonths: number[] = useMemo(() => {
    if (!data || matrixYear == null) return [];
    const months: number[] = [];
    for (let m = 0; m < 12; m++) {
      for (const k of visibleKotas) {
        const cell = data.pivotKota[matrixYear]?.[m]?.[k];
        if (!cell) continue;
        let any = false;
        for (const d of visibleDepartments) {
          if (typeof cell[d] === "number") { any = true; break; }
        }
        if (any) { months.push(m); break; }
      }
    }
    return months;
  }, [data, matrixYear, visibleKotas, visibleDepartments]);

  // Snap selectedMonth into availableMonths when filters change.
  useEffect(() => {
    if (availableMonths.length === 0) return;
    if (!availableMonths.includes(selectedMonth)) {
      setSelectedMonth(availableMonths[availableMonths.length - 1]);
    }
  }, [availableMonths, selectedMonth]);

  // Initialize selectedMonth to latest available month on first data load.
  useEffect(() => {
    if (availableMonths.length > 0 && selectedMonth === -1) {
      setSelectedMonth(availableMonths[availableMonths.length - 1]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [availableMonths]);

  /** Trend chart years: when "all", overlay every year in the dataset. */
  const trendYears = useMemo(() => {
    if (!ready || !viewData) return [];
    if (primaryYear === "all") return [...viewData.years];
    const prev = primaryYear - 1;
    const out = [primaryYear];
    if (viewData.years.includes(prev)) out.unshift(prev);
    return out;
  }, [ready, viewData, primaryYear]);

  const handleReset = () => {
    setPrimaryYear("all");
    setSelectedKota("all");
    setSelectedDept("all");
  };

  const kotaLabel =
    selectedKota === "all" ? "Semua Kota" : KOTA_NAMES[selectedKota];

  /**
   * The full-screen loading splash should appear:
   *  - on the very first load, before any cached data is on screen
   *  - whenever the user clicks "Update Data" (refreshing === true)
   * It hides itself otherwise. Distinct copy per scenario so the user
   * understands what's happening.
   */
  const showLoadingOverlay = (loading && !data) || refreshing;
  const isInitialLoad = loading && !data;
  const overlayTitle = isInitialLoad
    ? "Memuat Data Analytics"
    : "Memperbarui Data";
  const overlayStatus = isInitialLoad
    ? `Mengambil data ${new Date().getFullYear()}...`
    : "Sinkronisasi dengan Apps Script...";

  return (
    <div className="relative min-h-screen">
      <BgDecoration />

      <LoadingOverlay
        visible={showLoadingOverlay}
        title={overlayTitle}
        status={overlayStatus}
      />

      <div className="relative z-10">
        <Header loading={loading} refreshing={refreshing} fetchedAt={fetchedAt} fromCache={fromCache} isStale={isStale} onUpdateData={updateData}>
          {ready && data && activeTab !== "brand" && (
            <Filters
              years={data.years}
              kotas={data.kotas}
              selectedYear={primaryYear}
              onYearChange={(v) => setPrimaryYear(v)}
              selectedKota={selectedKota}
              onKotaChange={setSelectedKota}
              selectedDept={selectedDept}
              onDeptChange={setSelectedDept}
              activeTab={activeTab}
              selectedMonth={selectedMonth}
              onMonthChange={setSelectedMonth}
              availableMonths={availableMonths}
              onReset={handleReset}
            />
          )}
          {activeTab === "brand" && brandState.data && (
            <BrandFilters
              years={brandState.data.years}
              selectedYear={brandYear}
              onYearChange={setBrandYear}
              startMonth={brandStartMonth}
              endMonth={brandEndMonth}
              onStartMonthChange={setBrandStartMonth}
              onEndMonthChange={setBrandEndMonth}
              departments={brandState.data.departments}
              selectedDepartments={brandDepartments}
              onDepartmentsChange={setBrandDepartments}
            />
          )}
          {ready && data && (
            <Tabs active={activeTab} onChange={(tab) => {
              setActiveTab(tab);
              // Reset all filters to tab-specific defaults
              setSelectedKota("all");
              setSelectedDept("all");
              if (tab === "yearly") {
                setPrimaryYear("all");
              } else if (tab === "monthly") {
                // Bulanan: default to latest year
                if (data && data.years.length > 0) {
                  setPrimaryYear(data.years[data.years.length - 1]);
                }
                // selectedMonth will auto-snap to latest via existing effect
                setSelectedMonth(-1);
              }
              // brand tab: no additional filter reset needed
            }} />
          )}
          {activeTab === "brand" && brandState.data && (
            <BrandFilters
              years={brandState.data.years}
              selectedYear={brandYear}
              onYearChange={setBrandYear}
              startMonth={brandStartMonth}
              endMonth={brandEndMonth}
              onStartMonthChange={setBrandStartMonth}
              onEndMonthChange={setBrandEndMonth}
              departments={brandState.data.departments}
              selectedDepartments={brandDepartments}
              onDepartmentsChange={setBrandDepartments}
            />
          )}
        </Header>

        <main className="mx-auto max-w-[1500px] space-y-5 px-4 py-6 md:px-8 md:py-8">
          {!loading && error && <ErrorState message={error} />}
          {!loading && !error && data && data.records.length === 0 && (
            <EmptyState />
          )}

          {ready && viewData && data && matrixYear != null && (
            <>
              {activeTab === "yearly" ? (
                <>
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
                      estimationKey={estimationKey}
                    />
                  </SectionCard>

                  <SectionCard
                    title={`Revenue Bulanan • Year over Year • ${kotaLabel}`}
                    description={
                      trendYears.length > 1
                        ? `Total revenue per bulan • ${trendYears.join(" vs ")}`
                        : `Total revenue per bulan • ${matrixYear}`
                    }
                    tag={{ label: "YoY · Revenue", tone: "green" }}
                  >
                    <RevenueYoYBarChart
                      data={viewData}
                      selectedYears={trendYears}
                      selectedDepartments={visibleDepartments}
                      estimationKey={estimationKey}
                    />
                  </SectionCard>

                  <SectionCard
                    title={`Matriks Bulanan ${matrixYear} • ${kotaLabel}`}
                    description="Omset, MoM (Month-over-Month) & YoY (Year-over-Year) per departemen + total. MoM bulan Januari dihitung dari Desember tahun sebelumnya."
                    tag={{ label: "Tahunan · Pivot", tone: "purple" }}
                  >
                    <YearlyMatrix data={viewData} year={matrixYear} estimationKey={estimationKey} />
                  </SectionCard>

                  {jasaState.data && (
                    <SectionCard
                      title={`Matriks Bulanan Jasa 2026 • ${selectedKota === "all" ? "Semua Kota" : KOTA_NAMES[selectedKota]}`}
                      description="Breakdown Jasa Sales, Jasa Service, Jasa Part per bulan dengan MoM."
                      tag={{ label: "Jasa · Pivot", tone: "amber" }}
                    >
                      <JasaMatrix jasaState={jasaState} selectedKota={selectedKota} />
                    </SectionCard>
                  )}

                  <SectionCard
                    title={`Performa per Kota • ${matrixYear}`}
                    description="Total omset per cabang dengan share kontribusi dan YoY. Klik header untuk mengurutkan."
                    tag={{ label: "Kota · Breakdown", tone: "amber" }}
                  >
                    <KotaBreakdown data={data} year={matrixYear} estimationKey={estimationKey} />
                  </SectionCard>

                  <JasaBreakdown
                    jasaState={jasaState}
                    selectedYear={primaryYear}
                    selectedKota={selectedKota}
                    selectedDept={selectedDept}
                  />

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

                  <DataTable
                    data={viewData}
                    selectedYears={primaryYear === "all" ? data.years : [primaryYear]}
                    selectedDepartments={visibleDepartments}
                  />
                </>
              ) : activeTab === "monthly" ? (
                <MonthlyAnalysis
                  data={data}
                  year={matrixYear}
                  selectedKota={selectedKota}
                  selectedDept={selectedDept}
                  visibleDepartments={visibleDepartments}
                  selectedMonth={selectedMonth}
                />
              ) : (
                <BrandAnalysis
                  brandState={brandState}
                  selectedYear={brandYear}
                  startMonth={brandStartMonth}
                  endMonth={brandEndMonth}
                  selectedDepartments={brandDepartments}
                />
              )}

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
