import { Calendar, Layers } from "lucide-react";
import { DEPARTMENTS, type Department } from "../lib/csvParser";
import { classNames } from "../lib/format";

interface FiltersProps {
  years: number[];
  selectedYears: number[];
  onYearsChange: (next: number[]) => void;

  departments: Department[];
  selectedDepartments: Department[];
  onDepartmentsChange: (next: Department[]) => void;

  primaryYear: number | null;
  onPrimaryYearChange: (y: number) => void;
}

export function Filters({
  years,
  selectedYears,
  onYearsChange,
  departments,
  selectedDepartments,
  onDepartmentsChange,
  primaryYear,
  onPrimaryYearChange,
}: FiltersProps) {
  const toggleYear = (y: number) => {
    if (selectedYears.includes(y)) {
      if (selectedYears.length === 1) return; // keep at least one
      onYearsChange(selectedYears.filter((x) => x !== y));
    } else {
      onYearsChange([...selectedYears, y].sort((a, b) => a - b));
    }
  };

  const toggleDept = (d: Department) => {
    if (selectedDepartments.includes(d)) {
      if (selectedDepartments.length === 1) return;
      onDepartmentsChange(selectedDepartments.filter((x) => x !== d));
    } else {
      onDepartmentsChange(
        [...selectedDepartments, d].sort(
          (a, b) => DEPARTMENTS.indexOf(a) - DEPARTMENTS.indexOf(b)
        )
      );
    }
  };

  return (
    <div className="glass-card flex flex-wrap items-center gap-x-6 gap-y-4 p-4 md:p-5">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
          <Calendar className="h-4 w-4" />
          Tahun
        </div>
        <div className="flex flex-wrap gap-2">
          {years.map((y) => {
            const active = selectedYears.includes(y);
            const isPrimary = primaryYear === y;
            return (
              <button
                key={y}
                onClick={() => toggleYear(y)}
                onDoubleClick={() => onPrimaryYearChange(y)}
                title={
                  isPrimary
                    ? "Tahun utama (klik 2x untuk mengubah)"
                    : "Klik 2x untuk jadikan tahun utama"
                }
                className={classNames(
                  "rounded-xl border px-3 py-1.5 text-sm font-semibold transition",
                  active
                    ? "border-brand-500 bg-brand-500/10 text-brand-700 dark:text-brand-300"
                    : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 dark:border-white/10 dark:bg-white/5 dark:text-slate-300",
                  isPrimary && "ring-2 ring-brand-500/40"
                )}
              >
                {y}
                {isPrimary && (
                  <span className="ml-1.5 inline-flex h-1.5 w-1.5 rounded-full bg-brand-500" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div className="hidden h-8 w-px bg-slate-200 dark:bg-white/10 md:block" />

      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
          <Layers className="h-4 w-4" />
          Departemen
        </div>
        <div className="flex flex-wrap gap-2">
          {departments.map((d) => {
            const active = selectedDepartments.includes(d);
            return (
              <button
                key={d}
                onClick={() => toggleDept(d)}
                className={classNames(
                  "rounded-xl border px-3 py-1.5 text-sm font-medium transition",
                  active
                    ? "border-brand-500 bg-brand-500/10 text-brand-700 dark:text-brand-300"
                    : "border-slate-200 bg-white text-slate-500 hover:border-slate-300 dark:border-white/10 dark:bg-white/5 dark:text-slate-400"
                )}
              >
                {d}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
