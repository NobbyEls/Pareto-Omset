import { Calendar, Layers } from "lucide-react";
import { DEPARTMENTS, type Department } from "../lib/csvParser";

interface FiltersProps {
  years: number[];
  /** The single active year — drives every chart and matrix. */
  primaryYear: number;
  /** Switch to a different active year. */
  onPrimaryYearChange: (y: number) => void;

  departments: Department[];
  selectedDepartments: Department[];
  onDepartmentsChange: (next: Department[]) => void;
}

export function Filters({
  years,
  primaryYear,
  onPrimaryYearChange,
  departments,
  selectedDepartments,
  onDepartmentsChange,
}: FiltersProps) {
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
        <div
          className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider"
          style={{ color: "var(--text-dim)" }}
        >
          <Calendar className="h-4 w-4" />
          Tahun
        </div>
        <div
          role="radiogroup"
          aria-label="Pilih tahun"
          className="flex flex-wrap gap-2"
        >
          {years.map((y) => {
            const active = primaryYear === y;
            return (
              <button
                key={y}
                role="radio"
                aria-checked={active}
                onClick={() => onPrimaryYearChange(y)}
                className="rounded-xl border px-3 py-1.5 text-sm font-semibold transition"
                style={
                  active
                    ? {
                        background:
                          "linear-gradient(135deg, rgba(99, 102, 241, 0.25), rgba(236, 72, 153, 0.25))",
                        borderColor: "rgba(99, 102, 241, 0.55)",
                        color: "#fff",
                        boxShadow: "0 0 25px rgba(236, 72, 153, 0.25)",
                      }
                    : {
                        background: "var(--bg-glass)",
                        borderColor: "var(--border-medium)",
                        color: "var(--text-muted)",
                      }
                }
              >
                {y}
              </button>
            );
          })}
        </div>
      </div>

      <div
        className="hidden h-8 w-px md:block"
        style={{ background: "var(--border-medium)" }}
      />

      <div className="flex items-center gap-3">
        <div
          className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider"
          style={{ color: "var(--text-dim)" }}
        >
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
                className="rounded-xl border px-3 py-1.5 text-sm font-medium transition"
                style={
                  active
                    ? {
                        background: "rgba(236, 72, 153, 0.15)",
                        borderColor: "rgba(236, 72, 153, 0.45)",
                        color: "#fbcfe8",
                      }
                    : {
                        background: "var(--bg-glass)",
                        borderColor: "var(--border-medium)",
                        color: "var(--text-dim)",
                      }
                }
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
