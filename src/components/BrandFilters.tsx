import { Calendar, Layers, Filter } from "lucide-react";
import { MONTHS_ID } from "../lib/format";
import { classNames } from "../lib/format";

const selectClass =
  "rounded-lg border border-white/15 bg-slate-700 px-3 py-1.5 text-sm font-medium text-slate-100 transition hover:border-white/25 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 [&>option]:bg-slate-700 [&>option]:text-slate-100";

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
    <div
      className="flex flex-wrap items-center gap-x-6 gap-y-3 rounded-xl px-5 py-3"
      style={{
        background: "rgba(15, 23, 42, 0.85)",
        borderBottom: "1px solid rgba(255,255,255,0.08)",
      }}
    >
      {/* Year filter */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-slate-400">
          <Calendar className="h-3.5 w-3.5" />
          Tahun
        </div>
        <div className="flex flex-wrap gap-1.5">
          {years.map((y) => (
            <button
              key={y}
              onClick={() => onYearChange(y)}
              className={classNames(
                "rounded-lg border px-3 py-1.5 text-sm font-semibold transition",
                selectedYear === y
                  ? "border-indigo-400/60 bg-indigo-500/20 text-white ring-1 ring-indigo-400/40"
                  : "border-white/15 bg-slate-700 text-slate-200 hover:border-white/25"
              )}
            >
              {y}
            </button>
          ))}
        </div>
      </div>

      <div className="hidden h-6 w-px bg-white/10 md:block" />

      {/* Period filter */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-slate-400">
          <Filter className="h-3.5 w-3.5" />
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
          <span className="text-xs text-slate-500">s/d</span>
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

      <div className="hidden h-6 w-px bg-white/10 md:block" />

      {/* Department filter */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-slate-400">
          <Layers className="h-3.5 w-3.5" />
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
