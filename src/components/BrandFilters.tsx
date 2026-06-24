import { Calendar, Layers, Filter } from "lucide-react";
import { MONTHS_ID } from "../lib/format";
import { classNames } from "../lib/format";

const selectClass =
  "rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-sm font-medium text-slate-700 transition hover:border-slate-300 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:border-white/15 dark:bg-slate-800 dark:text-slate-200 dark:hover:border-white/25 [&>option]:bg-white [&>option]:text-slate-800 dark:[&>option]:bg-slate-800 dark:[&>option]:text-slate-200";

interface BrandFiltersProps {
  years: number[];
  selectedYear: number;
  onYearChange: (y: number) => void;

  startMonth: number;
  endMonth: number;
  onStartMonthChange: (m: number) => void;
  onEndMonthChange: (m: number) => void;

  departments: string[];
  selectedDepartment: string;
  onDepartmentChange: (d: string) => void;
}

export function BrandFilters({
  years,
  selectedYear,
  onYearChange,
  startMonth,
  endMonth,
  onStartMonthChange,
  onEndMonthChange,
  departments,
  selectedDepartment,
  onDepartmentChange,
}: BrandFiltersProps) {
  return (
    <div className="glass-card flex flex-wrap items-center gap-x-6 gap-y-4 p-4 md:p-5">
      {/* Year filter */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
          <Calendar className="h-4 w-4" />
          Tahun
        </div>
        <div className="flex flex-wrap gap-2">
          {years.map((y) => (
            <button
              key={y}
              onClick={() => onYearChange(y)}
              className={classNames(
                "rounded-xl border px-3 py-1.5 text-sm font-semibold transition",
                selectedYear === y
                  ? "border-brand-500 bg-brand-500/10 text-brand-700 dark:text-brand-300 ring-2 ring-brand-500/40"
                  : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 dark:border-white/10 dark:bg-white/5 dark:text-slate-300"
              )}
            >
              {y}
            </button>
          ))}
        </div>
      </div>

      <div className="hidden h-8 w-px bg-slate-200 dark:bg-white/10 md:block" />

      {/* Period filter */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
          <Filter className="h-4 w-4" />
          Periode
        </div>
        <div className="flex items-center gap-2">
          <select
            value={startMonth}
            onChange={(e) => onStartMonthChange(Number(e.target.value))}
            className={selectClass}
          >
            {MONTHS_ID.map((m, idx) => (
              <option key={idx} value={idx}>
                {m}
              </option>
            ))}
          </select>
          <span className="text-xs text-slate-400">s/d</span>
          <select
            value={endMonth}
            onChange={(e) => onEndMonthChange(Number(e.target.value))}
            className={selectClass}
          >
            {MONTHS_ID.map((m, idx) => (
              <option key={idx} value={idx} disabled={idx < startMonth}>
                {m}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="hidden h-8 w-px bg-slate-200 dark:bg-white/10 md:block" />

      {/* Department filter */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
          <Layers className="h-4 w-4" />
          Departemen
        </div>
        <select
          value={selectedDepartment}
          onChange={(e) => onDepartmentChange(e.target.value)}
          className={selectClass}
        >
          <option value="__all__">Semua Departemen</option>
          {departments.map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
