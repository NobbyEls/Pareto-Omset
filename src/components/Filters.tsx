import { Filter as FilterIcon, RotateCcw } from "lucide-react";
import {
  DEPARTMENTS,
  KOTA_NAMES,
  type Department,
  type KotaCode,
} from "../lib/csvParser";
import { MONTHS_ID } from "../lib/format";
import type { TabKey } from "./Tabs";

export type DeptFilter = Department | "all";
export type KotaFilter = KotaCode | "all";

export type YearFilter = number | "all";

interface FiltersProps {
  years: number[];
  kotas: KotaCode[];

  selectedYear: YearFilter;
  onYearChange: (y: YearFilter) => void;

  selectedKota: KotaFilter;
  onKotaChange: (k: KotaFilter) => void;

  selectedDept: DeptFilter;
  onDeptChange: (d: DeptFilter) => void;

  activeTab: TabKey;

  /** Month filter (0-indexed). Only used when activeTab === "monthly". */
  selectedMonth: number;
  onMonthChange: (m: number) => void;
  /** Available month indices for the current year/filter selection. */
  availableMonths: number[];

  onReset: () => void;
}

interface FieldProps {
  label: string;
  children: React.ReactNode;
}

function Field({ label, children }: FieldProps) {
  return (
    <div className="filter-group">
      <label>{label}</label>
      {children}
    </div>
  );
}

export function Filters({
  years,
  kotas,
  selectedYear,
  onYearChange,
  selectedKota,
  onKotaChange,
  selectedDept,
  onDeptChange,
  activeTab,
  selectedMonth,
  onMonthChange,
  availableMonths,
  onReset,
}: FiltersProps) {
  return (
    <section className="filters-section animate-fadeIn">
      <div className="filters-icon" aria-hidden>
        <FilterIcon className="h-5 w-5" />
      </div>

      <div className="filter-grid">
        <Field label="Tahun">
          <select
            value={String(selectedYear)}
            onChange={(e) => {
              const v = e.target.value;
              onYearChange(v === "all" ? "all" : Number(v));
            }}
          >
            {activeTab !== "monthly" && (
              <option value="all">Semua Tahun</option>
            )}
            {years.map((y) => (
              <option key={y} value={String(y)}>
                {y}
              </option>
            ))}
          </select>
        </Field>

        {activeTab === "monthly" && availableMonths.length > 0 && (
          <Field label="Bulan">
            <select
              value={String(selectedMonth)}
              onChange={(e) => onMonthChange(Number(e.target.value))}
            >
              {availableMonths.map((m) => (
                <option key={m} value={String(m)}>
                  {MONTHS_ID[m]}
                </option>
              ))}
            </select>
          </Field>
        )}

        <Field label="Kota">
          <select
            value={selectedKota}
            onChange={(e) => onKotaChange(e.target.value as KotaFilter)}
          >
            <option value="all">Semua Kota</option>
            {kotas.map((k) => (
              <option key={k} value={k}>
                {KOTA_NAMES[k]} ({k})
              </option>
            ))}
          </select>
        </Field>

        <Field label="Departemen">
          <select
            value={selectedDept}
            onChange={(e) => onDeptChange(e.target.value as DeptFilter)}
          >
            <option value="all">Semua Departemen</option>
            {DEPARTMENTS.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <button onClick={onReset} className="btn-reset" type="button">
        <RotateCcw className="h-3.5 w-3.5" />
        Reset
      </button>
    </section>
  );
}
