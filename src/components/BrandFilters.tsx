import { useState, useRef, useEffect } from "react";
import { Calendar, Layers, Filter, ChevronDown, Check } from "lucide-react";
import { MONTHS_ID } from "../lib/format";

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
  const noneSelected = selectedDepartments.length === 0;

  const toggleDept = (d: string) => {
    if (selectedDepartments.includes(d)) {
      onDepartmentsChange(selectedDepartments.filter((x) => x !== d));
    } else {
      onDepartmentsChange([...selectedDepartments, d]);
    }
  };

  const toggleAll = () => {
    if (allSelected) {
      onDepartmentsChange([]);
    } else {
      onDepartmentsChange([...departments]);
    }
  };

  const label = noneSelected
    ? "Semua Departemen"
    : allSelected
      ? "Semua Departemen"
      : selectedDepartments.length === 1
        ? selectedDepartments[0]
        : `${selectedDepartments.length} Departemen`;

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="filter-group-select flex items-center gap-2"
      >
        <span className="max-w-[160px] truncate">{label}</span>
        <ChevronDown className="h-3.5 w-3.5 opacity-60" />
      </button>
      {open && (
        <div
          className="absolute left-0 top-full z-50 mt-1 max-h-[300px] w-[220px] overflow-y-auto rounded-xl border p-1.5 shadow-xl"
          style={{
            background: "var(--bg-card)",
            borderColor: "var(--border-subtle)",
          }}
        >
          {/* Select all */}
          <button
            onClick={toggleAll}
            className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs font-medium transition hover:opacity-80"
            style={{ color: "var(--text-primary)" }}
          >
            <div
              className="flex h-4 w-4 items-center justify-center rounded border"
              style={{
                borderColor: allSelected || noneSelected ? "var(--indigo)" : "var(--border-medium)",
                background: allSelected || noneSelected ? "var(--indigo)" : "transparent",
              }}
            >
              {(allSelected || noneSelected) && <Check className="h-3 w-3 text-white" />}
            </div>
            Semua Departemen
          </button>
          <div className="my-1 h-px" style={{ background: "var(--border-subtle)" }} />
          {departments.map((d) => {
            const checked = selectedDepartments.includes(d);
            return (
              <button
                key={d}
                onClick={() => toggleDept(d)}
                className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs transition hover:opacity-80"
                style={{ color: "var(--text-muted)" }}
              >
                <div
                  className="flex h-4 w-4 items-center justify-center rounded border"
                  style={{
                    borderColor: checked ? "var(--indigo)" : "var(--border-medium)",
                    background: checked ? "var(--indigo)" : "transparent",
                  }}
                >
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
      className="sticky z-20 -mx-4 mb-5 flex flex-wrap items-center gap-x-6 gap-y-3 px-5 py-3 md:-mx-8"
      style={{
        top: "105px",
        background: "var(--bg-glass)",
        border: "1px solid var(--border-subtle)",
        borderRadius: "12px",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
      }}
    >
      {/* Year filter — dropdown */}
      <div className="filter-group">
        <label>
          <Calendar className="inline h-3.5 w-3.5 mr-1" />
          Tahun
        </label>
        <select
          value={selectedYear}
          onChange={(e) => onYearChange(Number(e.target.value))}
        >
          {years.map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </select>
      </div>

      {/* Period filter */}
      <div className="filter-group">
        <label>
          <Filter className="inline h-3.5 w-3.5 mr-1" />
          Periode
        </label>
        <div className="flex items-center gap-2">
          <select
            value={startMonth}
            onChange={(e) => onStartMonthChange(Number(e.target.value))}
          >
            {MONTHS_ID.map((m, idx) => (
              <option key={idx} value={idx}>
                {m}
              </option>
            ))}
          </select>
          <span className="text-xs" style={{ color: "var(--text-dim)" }}>s/d</span>
          <select
            value={endMonth}
            onChange={(e) => onEndMonthChange(Number(e.target.value))}
          >
            {MONTHS_ID.map((m, idx) => (
              <option key={idx} value={idx} disabled={idx < startMonth}>
                {m}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Department filter — checklist multi-select */}
      <div className="filter-group">
        <label>
          <Layers className="inline h-3.5 w-3.5 mr-1" />
          Departemen
        </label>
        <DepartmentChecklist
          departments={departments}
          selectedDepartments={selectedDepartments}
          onDepartmentsChange={onDepartmentsChange}
        />
      </div>
    </div>
  );
}
