import { useEffect, useMemo, useState } from "react";
import { Header } from "./components/Header";
import { Filters } from "./components/Filters";
import { KpiCards } from "./components/KpiCards";
import { SectionCard } from "./components/SectionCard";
import { DataTable } from "./components/DataTable";
import { CsvUrlInput } from "./components/CsvUrlInput";
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
import { BrandAnalysis } from "./components/BrandAnalysis";
import { useDataset } from "./lib/dataset";
import { DEPARTMENTS, type Department } from "./lib/csvParser";
import { classNames } from "./lib/format";

type TabId = "omset" | "brand";

export default function App() {
  const { data, loading, error, fetchedAt, csvUrl, refresh, setCsvUrl } =
    useDataset();

  const [activeTab, setActiveTab] = useState<TabId>("omset");
  const [selectedYears, setSelectedYears] = useState<number[]>([]);
  const [primaryYear, setPrimaryYear] = useState<number | null>(null);
  const [selectedDepartments, setSelectedDepartments] = useState<Department[]>([
    ...DEPARTMENTS,
  ]);

  // Initialize / reconcile selected years when data loads.
  useEffect(() => {
    if (!data) return;
    if (data.years.length === 0) {
      setSelectedYears([]);
      setPrimaryYear(null);
      return;
    }
    setSelectedYears((prev) => {
      const valid = prev.filter((y) => data.years.includes(y));
      return valid.length ? valid : data.years.slice();
    });
    setPrimaryYear((prev) => {
      if (prev != null && data.years.includes(prev)) return prev;
      return data.years[data.years.length - 1];
    });
  }, [data]);

  const hasData = !!data && data.records.length > 0;
  const ready = hasData && primaryYear != null && selectedYears.length > 0;

  const yoyAvailable = useMemo(
    () =>
      ready &&
      data!.years.includes((primaryYear as number) - 1),
    [ready, data, primaryYear]
  );

  return (
    <div className="min-h-screen">
      <Header
        loading={loading}
        fetchedAt={fetchedAt}
        onRefresh={refresh}
        csvUrl={csvUrl}
      />

      <main className="mx-auto max-w-[1500px] space-y-5 px-4 py-6 md:px-8 md:py-8">
        {/* Tab navigation */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-1 rounded-xl border border-slate-200 bg-white p-1 dark:border-white/10 dark:bg-white/5">
            <button
              onClick={() => setActiveTab("omset")}
              className={classNames(
                "rounded-lg px-4 py-2 text-sm font-semibold transition",
                activeTab === "omset"
                  ? "bg-brand-500 text-white shadow-glow"
                  : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-white/10"
              )}
            >
              Analisa Omset
            </button>
            <button
              onClick={() => setActiveTab("brand")}
              className={classNames(
                "rounded-lg px-4 py-2 text-sm font-semibold transition",
                activeTab === "brand"
                  ? "bg-brand-500 text-white shadow-glow"
                  : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-white/10"
              )}
            >
              Analisa Brand
            </button>
          </div>
          {activeTab === "omset" && (
            <CsvUrlInput url={csvUrl} onChange={setCsvUrl} />
          )}
        </div>

        {/* Tab description */}
        {activeTab === "omset" && (
          <div>
            <h2 className="text-xl font-bold tracking-tight md:text-2xl">
              Analisa Omset
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Pantau performa bulanan dan tahunan dari spreadsheet yang
              ter-update otomatis setiap hari.
            </p>
          </div>
        )}
        {activeTab === "brand" && (
          <div>
            <h2 className="text-xl font-bold tracking-tight md:text-2xl">
              Analisa Brand
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Analisa kontribusi brand berdasarkan omset, diurutkan dari yang
              tertinggi (Pareto).
            </p>
          </div>
        )}

        {/* Omset Tab */}
        {activeTab === "omset" && (
          <>
            {loading && !data && <LoadingState />}
            {!loading && error && <ErrorState message={error} />}
            {!loading && !error && data && data.records.length === 0 && (
              <EmptyState />
            )}

            {ready && data && primaryYear != null && (
              <>
                <Filters
                  years={data.years}
                  selectedYears={selectedYears}
                  onYearsChange={setSelectedYears}
                  departments={[...DEPARTMENTS]}
                  selectedDepartments={selectedDepartments}
                  onDepartmentsChange={setSelectedDepartments}
                  primaryYear={primaryYear}
                  onPrimaryYearChange={setPrimaryYear}
                />

                <KpiCards
                  data={data}
                  primaryYear={primaryYear}
                  selectedDepartments={selectedDepartments}
                />

                <div className="grid gap-5 xl:grid-cols-3">
                  <SectionCard
                    title="Tren Bulanan Multi-Tahun"
                    description="Total omset per bulan untuk semua tahun yang dipilih"
                    className="xl:col-span-2"
                  >
                    <MonthlyTrendChart
                      data={data}
                      selectedYears={selectedYears}
                      selectedDepartments={selectedDepartments}
                    />
                  </SectionCard>

                  <SectionCard
                    title="Komposisi Departemen"
                    description={`Distribusi omset ${primaryYear} per departemen`}
                  >
                    <DepartmentDonut
                      data={data}
                      primaryYear={primaryYear}
                      selectedDepartments={selectedDepartments}
                    />
                  </SectionCard>
                </div>

                <div className="grid gap-5 xl:grid-cols-2">
                  <SectionCard
                    title="Stacked Bulanan per Departemen"
                    description={`Kontribusi tiap departemen tiap bulan • ${primaryYear}`}
                  >
                    <DepartmentStackedBar
                      data={data}
                      primaryYear={primaryYear}
                      selectedDepartments={selectedDepartments}
                    />
                  </SectionCard>

                  <SectionCard
                    title="Performa Departemen"
                    description={`Tren bulanan setiap departemen di ${primaryYear}`}
                  >
                    <DepartmentDeepDive
                      data={data}
                      primaryYear={primaryYear}
                      selectedDepartments={selectedDepartments}
                    />
                  </SectionCard>
                </div>

                {yoyAvailable && (
                  <SectionCard
                    title={`Year-over-Year • ${primaryYear} vs ${primaryYear - 1}`}
                    description="Bandingkan omset bulanan dan persentase pertumbuhan tahunan"
                  >
                    <YoYChart
                      data={data}
                      primaryYear={primaryYear}
                      selectedDepartments={selectedDepartments}
                    />
                  </SectionCard>
                )}

                <DataTable
                  data={data}
                  selectedYears={selectedYears}
                  selectedDepartments={selectedDepartments}
                />
              </>
            )}
          </>
        )}

        {/* Brand Analysis Tab */}
        {activeTab === "brand" && <BrandAnalysis />}

        <footer className="pt-2 pb-6 text-center text-xs text-slate-400">
          Data bersumber dari Google Sheets • dibangun dengan React + Vite +
          Tailwind + Recharts
        </footer>
      </main>
    </div>
  );
}
