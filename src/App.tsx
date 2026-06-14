import { useEffect, useMemo, useState } from "react";
import { Header } from "./components/Header";
import { Filters } from "./components/Filters";
import { KpiCards } from "./components/KpiCards";
import { SectionCard } from "./components/SectionCard";
import { DataTable } from "./components/DataTable";
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
  const { data, loading, error, fetchedAt, refresh } = useDataset();

  const [primaryYear, setPrimaryYear] = useState<number | null>(null);
  const [selectedDepartments, setSelectedDepartments] = useState<Department[]>([
    ...DEPARTMENTS,
  ]);

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
   * Tahun yang dipakai chart Tren: tahun aktif + tahun sebelumnya (kalau ada
   * di data) supaya overlay YoY tetap muncul. Filter chip menentukan tahun
   * fokus, bukan membatasi grafik perbandingan.
   */
  const trendYears = useMemo(() => {
    if (!ready || !data || primaryYear == null) return [];
    const cur = primaryYear;
    const prev = primaryYear - 1;
    const out = [cur];
    if (data.years.includes(prev)) out.unshift(prev);
    return out;
  }, [ready, data, primaryYear]);

  const yoyAvailable = useMemo(
    () => ready && data!.years.includes((primaryYear as number) - 1),
    [ready, data, primaryYear]
  );

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

          {ready && data && primaryYear != null && (
            <>
              <Filters
                years={data.years}
                primaryYear={primaryYear}
                onPrimaryYearChange={setPrimaryYear}
                departments={[...DEPARTMENTS]}
                selectedDepartments={selectedDepartments}
                onDepartmentsChange={setSelectedDepartments}
              />

              <KpiCards
                data={data}
                primaryYear={primaryYear}
                selectedDepartments={selectedDepartments}
              />

              <SectionCard
                title="Tren Bulanan"
                description={
                  trendYears.length > 1
                    ? `Total omset per bulan • ${primaryYear} vs ${primaryYear - 1}`
                    : `Total omset per bulan • ${primaryYear}`
                }
                tag={{ label: "YoY · Trend", tone: "blue" }}
              >
                <MonthlyTrendChart
                  data={data}
                  selectedYears={trendYears}
                  selectedDepartments={selectedDepartments}
                />
              </SectionCard>

              <SectionCard
                title={`Matriks Bulanan ${primaryYear}`}
                description="Omset, MoM (Month-over-Month) & YoY (Year-over-Year) per departemen + total. MoM bulan Januari dihitung dari Desember tahun sebelumnya."
                tag={{ label: "Tahunan · Pivot", tone: "purple" }}
              >
                <YearlyMatrix data={data} year={primaryYear} />
              </SectionCard>

              <div className="grid gap-5 xl:grid-cols-2">
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
              </div>

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
                selectedYears={[primaryYear]}
                selectedDepartments={selectedDepartments}
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
