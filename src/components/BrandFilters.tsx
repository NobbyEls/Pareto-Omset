import { useState, useRef, useEffect } from "react";
import { Calendar, Layers, Filter, ChevronDown, Check } from "lucide-react";
import { MONTHS_ID } from "../lib/format";

const selectClass =
  "rounded-lg border border-white/15 bg-white/10 px-3 py-1.5 text-sm font-medium text-slate-100 transition hover:border-white/25 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 [&>option]:bg-slate-800 [&>option]:text-slate-100";

interface BrandFiltersProps {
  years: number[];
  selectedYear: number;
  onYearChange: (y: number) => void;

  startMonth: number;
  endMonth: number;
  onStartMonthChange: (m: number) => void;
  onEndMonthChange: (m: number) => void;

  departments: string[];
  selectedDepartments: string[];
  onDepartmentsChange: (d: string[]) => void;
}

function DepartmentChecklist({
  departments,
  selectedDepartments,
  onDepartmentsChange,
}: {
  departments: string[];
  selectedDepartments: string[];
  onDepartmentsChange: (d: string[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const allSelected = selectedDepartments.length === departments.length;

  const toggleDept = (d: string) => {
    if (selectedDepartments.includes(d)) {
      const next = selectedDepartments.filter((x) => x !== d);
      if (next.length > 0) onDepartmentsChange(next);
    } else {
      onDepartmentsChange([...selectedDepartments, d]);
    }
  };

  const toggleAll = () => {
    if (allSelected) {
      onDepartmentsChange([departments[0]]);
    } else {
      onDepartmentsChange([...departments]);
    }
  };

  const label = allSelected
    ? "Semua Departemen"
    : selectedDepartments.length === 1
      ? selectedDepartments[0]
      : `${selectedDepartments.length} Departemen`;

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 rounded-lg border border-white/15 bg-white/10 px-3 py-1.5 text-sm font-medium text-slate-100 transition hover:border-white/25"
      >
        <span className="max-w-[160px] truncate">{label}</span>
        <ChevronDown className="h-3.5 w-3.5 opacity-60" />
      </button>
      {open && (
        <div
          className="absolute left-0 top-full z-50 mt-1 max-h-[300px] w-[220px] overflow-y-auto rounded-xl border border-white/15 bg-slate-800 p-1.5 shadow-xl"
        >
          {/* Select all */}
          <button
            onClick={toggleAll}
            className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-200 transition hover:bg-white/10"
          >
            <div className={`flex h-4 w-4 items-center justify-center rounded border ${allSelected ? "border-indigo-400 bg-indigo-500" : "border-white/30"}`}>
              {allSelected && <Check className="h-3 w-3 text-white" />}
            </div>
            Semua Departemen
          </button>
          <div className="my-1 h-px bg-white/10" />
          {departments.map((d) => {
            const checked = selectedDepartments.includes(d);
            return (
              <button
                key={d}
                onClick={() => toggleDept(d)}
                className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs text-slate-300 transition hover:bg-white/10"
              >
                <div className={`flex h-4 w-4 items-center justify-center rounded border ${checked ? "border-indigo-400 bg-indigo-500" : "border-white/30"}`}>
                  {checked && <Check className="h-3 w-3 text-white" />}
                </div>
                <span className="truncate">{d}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
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
  selectedDepartments,
  onDepartmentsChange,
}: BrandFiltersProps) {
  return (
    <div
      className="flex flex-wrap items-center gap-x-6 gap-y-3 rounded-xl px-5 py-3"
      style={{
        background: "var(--grad-primary)",
        border: "1px solid rgba(255,255,255,0.15)",
      }}
    >
      {/* Year filter — dropdown */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-white/70">
          <Calendar className="h-3.5 w-3.5" />
          Tahun
        </div>
        <select
          value={selectedYear}
          onChange={(e) => onYearChange(Number(e.target.value))}
          className={selectClass}
        >
          {years.map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </select>
      </div>

      <div className="hidden h-6 w-px bg-white/20 md:block" />

      {/* Period filter */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-white/70">
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
          <span className="text-xs text-white/50">s/d</span>
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

      <div className="hidden h-6 w-px bg-white/20 md:block" />

      {/* Department filter — checklist multi-select */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-white/70">
          <Layers className="h-3.5 w-3.5" />
          Departemen
        </div>
        <DepartmentChecklist
          departments={departments}
          selectedDepartments={selectedDepartments}
          onDepartmentsChange={onDepartmentsChange}
        />
      </div>
    </div>
  );
}
