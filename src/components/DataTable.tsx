import { useMemo, useState } from "react";
import { ArrowUpDown, Download, Search } from "lucide-react";
import {
  type Department,
  type ParsedDataset,
  totalFor,
  DEPARTMENTS,
} from "../lib/csvParser";
import { formatIDR, MONTHS_ID, classNames } from "../lib/format";

interface Props {
  data: ParsedDataset;
  selectedYears: number[];
  selectedDepartments: Department[];
}

interface Row {
  year: number;
  monthIdx: number;
  month: string;
  NB: number | null;
  PC: number | null;
  "JASA SERVICE": number | null;
  JASA: number | null;
  total: number | null;
}

type SortKey = keyof Pick<
  Row,
  "year" | "monthIdx" | "NB" | "PC" | "JASA SERVICE" | "JASA" | "total"
>;

export function DataTable({ data, selectedYears, selectedDepartments }: Props) {
  const [sortKey, setSortKey] = useState<SortKey>("year");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [query, setQuery] = useState("");

  const visibleDepts = selectedDepartments.length
    ? selectedDepartments
    : [...DEPARTMENTS];

  const rows: Row[] = useMemo(() => {
    const out: Row[] = [];
    for (const y of selectedYears) {
      for (let i = 0; i < 12; i++) {
        const m = data.pivot[y]?.[i];
        if (!m) continue;
        const row: Row = {
          year: y,
          monthIdx: i,
          month: MONTHS_ID[i],
          NB: typeof m.NB === "number" ? m.NB : null,
          PC: typeof m.PC === "number" ? m.PC : null,
          "JASA SERVICE":
            typeof m["JASA SERVICE"] === "number" ? m["JASA SERVICE"] : null,
          JASA: typeof m.JASA === "number" ? m.JASA : null,
          total: totalFor(data.pivot, y, i),
        };
        out.push(row);
      }
    }
    return out;
  }, [data, selectedYears]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let r = rows;
    if (q) {
      r = r.filter(
        (row) =>
          String(row.year).includes(q) ||
          row.month.toLowerCase().includes(q)
      );
    }
    const sorted = [...r].sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];
      const an = typeof av === "number" ? av : av == null ? -Infinity : NaN;
      const bn = typeof bv === "number" ? bv : bv == null ? -Infinity : NaN;
      const cmp = an === bn ? 0 : an > bn ? 1 : -1;
      return sortDir === "asc" ? cmp : -cmp;
    });
    return sorted;
  }, [rows, query, sortKey, sortDir]);

  const onSort = (k: SortKey) => {
    if (k === sortKey) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(k);
      setSortDir("desc");
    }
  };

  const downloadCSV = () => {
    const headers = ["Tahun", "Bulan", "NB", "PC", "JASA SERVICE", "JASA", "Total"];
    const lines = [headers.join(",")];
    for (const r of filtered) {
      lines.push(
        [
          r.year,
          r.month,
          r.NB ?? "",
          r.PC ?? "",
          r["JASA SERVICE"] ?? "",
          r.JASA ?? "",
          r.total ?? "",
        ].join(",")
      );
    }
    const blob = new Blob([lines.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `pareto-omset-${Date.now()}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const Th = ({ k, label, align = "right" }: { k: SortKey; label: string; align?: "left" | "right" }) => (
    <th
      onClick={() => onSort(k)}
      className={classNames(
        "cursor-pointer select-none px-3 py-2 text-xs font-semibold uppercase tracking-wider text-slate-500 transition hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200",
        align === "right" ? "text-right" : "text-left"
      )}
    >
      <span className={classNames(
        "inline-flex items-center gap-1",
        align === "right" && "flex-row-reverse"
      )}>
        {label}
        <ArrowUpDown
          className={classNames(
            "h-3 w-3 transition",
            sortKey === k
              ? "text-brand-500"
              : "text-slate-300 dark:text-slate-600"
          )}
        />
      </span>
    </th>
  );

  return (
    <div className="glass-card overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
        <div>
          <h3 className="text-sm font-semibold">Detail Per Bulan</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {filtered.length} baris • klik header untuk mengurutkan
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Cari tahun / bulan…"
              className="input pl-8"
            />
          </div>
          <button onClick={downloadCSV} className="btn">
            <Download className="h-4 w-4" />
            <span className="hidden sm:inline">Ekspor CSV</span>
          </button>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full">
          <thead className="border-y border-slate-200 bg-slate-50/60 dark:border-white/5 dark:bg-white/[0.02]">
            <tr>
              <Th k="year" label="Tahun" align="left" />
              <Th k="monthIdx" label="Bulan" align="left" />
              {visibleDepts.includes("NB") && <Th k="NB" label="NB" />}
              {visibleDepts.includes("PC") && <Th k="PC" label="PC" />}
              {visibleDepts.includes("JASA SERVICE") && (
                <Th k="JASA SERVICE" label="JASA Service" />
              )}
              {visibleDepts.includes("JASA") && <Th k="JASA" label="JASA" />}
              <Th k="total" label="Grand Total" />
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr>
                <td
                  colSpan={3 + visibleDepts.length}
                  className="px-5 py-10 text-center text-sm text-slate-500 dark:text-slate-400"
                >
                  Tidak ada data yang cocok.
                </td>
              </tr>
            )}
            {filtered.map((r) => (
              <tr
                key={`${r.year}-${r.monthIdx}`}
                className="border-b border-slate-100 transition hover:bg-slate-50/60 dark:border-white/5 dark:hover:bg-white/[0.03]"
              >
                <td className="px-3 py-2 text-sm font-semibold">{r.year}</td>
                <td className="px-3 py-2 text-sm">{r.month}</td>
                {visibleDepts.includes("NB") && (
                  <td className="px-3 py-2 text-right text-sm tabular-nums">
                    {r.NB == null ? "—" : formatIDR(r.NB)}
                  </td>
                )}
                {visibleDepts.includes("PC") && (
                  <td className="px-3 py-2 text-right text-sm tabular-nums">
                    {r.PC == null ? "—" : formatIDR(r.PC)}
                  </td>
                )}
                {visibleDepts.includes("JASA SERVICE") && (
                  <td className="px-3 py-2 text-right text-sm tabular-nums">
                    {r["JASA SERVICE"] == null
                      ? "—"
                      : formatIDR(r["JASA SERVICE"])}
                  </td>
                )}
                {visibleDepts.includes("JASA") && (
                  <td className="px-3 py-2 text-right text-sm tabular-nums">
                    {r.JASA == null ? "—" : formatIDR(r.JASA)}
                  </td>
                )}
                <td className="px-3 py-2 text-right text-sm font-semibold tabular-nums text-brand-600 dark:text-brand-400">
                  {r.total == null ? "—" : formatIDR(r.total)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
