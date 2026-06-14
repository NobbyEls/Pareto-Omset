import { useEffect, useMemo, useState } from "react";
import { Header } from "./components/Header";
import { Filters } from "./components/Filters";
import { KpiCards } from "./components/KpiCards";
import { SectionCard } from "./components/SectionCard";
import { DataTable } from "./components/DataTable";
import { CsvUrlInput } from "./components/CsvUrlInput";
import { YearlyMatrix } from "./components/YearlyMatrix";
import { BgDecoration } from "./components/BgDecoration";
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
import { DEPARTMENTS, type Department } from "./lib/csvParser";

export default function App() {
  const { data, loading, error, fetchedAt, csvUrl, refresh, setCsvUrl } =
    useDataset();

  const [selectedYears, setSelectedYears] = useState<number[]>([]);
  const [primaryYear, setPrimaryYear] = useState<number | null>(null);
  const [selectedDepartments, setSelectedDepartments] = useState<Department[]>([
    ...DEPARTMENTS,
  ]);

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
    () => ready && data!.years.includes((primaryYear as number) - 1),
    [ready, data, primaryYear]
  );

  return (
    <div className="relative min-h-screen">
      <BgDecoration />

      {/* Content sits above the orbs */}
      <div className="relative z-10">
        <Header
          loading={loading}
          fetchedAt={fetchedAt}
          onRefresh={refresh}
          csvUrl={csvUrl}
        />

        <main className="mx-auto max-w-[1500px] space-y-5 px-4 py-6 md:px-8 md:py-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2
                className="font-display text-xl font-bold tracking-tight md:text-2xl"
                style={{ color: "var(--text-primary)" }}
              >
                Analisa Omset
              </h2>
              <p
                className="text-sm"
                style={{ color: "var(--text-muted)" }}
              >
                Pantau performa bulanan dan tahunan dari spreadsheet yang
                ter-update otomatis setiap hari.
              </p>
            </div>
            <CsvUrlInput url={csvUrl} onChange={setCsvUrl} />
          </div>

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

              <SectionCard
                title={`Matriks Bulanan ${primaryYear}`}
                description="Omset, MoM (Month-over-Month) & YoY (Year-over-Year) per departemen + total — klik 2× chip tahun di filter untuk mengganti tahun"
                tag={{ label: "Tahunan · Pivot", tone: "purple" }}
              >
                <YearlyMatrix data={data} year={primaryYear} />
              </SectionCard>

              <div className="grid gap-5 xl:grid-cols-3">
                <SectionCard
                  title="Tren Bulanan Multi-Tahun"
                  description="Total omset per bulan untuk semua tahun yang dipilih"
                  className="xl:col-span-2"
                  tag={{ label: "YoY · Trend", tone: "blue" }}
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
                  tag={{ label: "Mix", tone: "pink" }}
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
                  tag={{ label: "Stack", tone: "cyan" }}
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
                  tag={{ label: "Lines", tone: "purple" }}
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
                  tag={{ label: "YoY · Growth", tone: "green" }}
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

              <footer
                className="pt-2 pb-6 text-center text-xs"
                style={{ color: "var(--text-dim)" }}
              >
                <strong style={{ color: "var(--text-muted)" }}>
                  Pareto Omset
                </strong>
                {" · "}Live data dari Google Sheets
                {" · "}
                Crafted with React, Vite, Recharts & Tailwind
              </footer>
            </>
          )}
        </main>
      </div>
    </div>
  );
}
