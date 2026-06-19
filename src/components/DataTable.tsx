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
  JASA: number | null;
  total: number | null;
}

type SortKey = keyof Pick<
  Row,
  "year" | "monthIdx" | "NB" | "PC" | "JASA" | "total"
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
        out.push({
          year: y,
          monthIdx: i,
          month: MONTHS_ID[i],
          NB: typeof m.NB === "number" ? m.NB : null,
          PC: typeof m.PC === "number" ? m.PC : null,
          JASA: typeof m.JASA === "number" ? m.JASA : null,
          total: totalFor(data.pivot, y, i),
        });
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
          String(row.year).includes(q) || row.month.toLowerCase().includes(q)
      );
    }
    return [...r].sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];
      const an = typeof av === "number" ? av : av == null ? -Infinity : NaN;
      const bn = typeof bv === "number" ? bv : bv == null ? -Infinity : NaN;
      const cmp = an === bn ? 0 : an > bn ? 1 : -1;
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [rows, query, sortKey, sortDir]);

  const onSort = (k: SortKey) => {
    if (k === sortKey) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(k);
      setSortDir("desc");
    }
  };

  const downloadCSV = () => {
    const headers = ["Tahun", "Bulan", "NB", "PC", "JASA", "Total"];
    const lines = [headers.join(",")];
    for (const r of filtered) {
      lines.push(
        [
          r.year,
          r.month,
          r.NB ?? "",
          r.PC ?? "",
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

  const Th = ({
    k,
    label,
    align = "right",
  }: {
    k: SortKey;
    label: string;
    align?: "left" | "right";
  }) => (
    <th
      onClick={() => onSort(k)}
      className={classNames(
        "cursor-pointer select-none px-3 py-2 text-xs font-semibold uppercase tracking-wider transition",
        align === "right" ? "text-right" : "text-left"
      )}
      style={{ color: "var(--text-dim)" }}
    >
      <span
        className={classNames(
          "inline-flex items-center gap-1",
          align === "right" && "flex-row-reverse"
        )}
      >
        {label}
        <ArrowUpDown
          className={classNames("h-3 w-3 transition")}
          style={{ color: sortKey === k ? "var(--tint-nb)" : "var(--text-dim)" }}
        />
      </span>
    </th>
  );

  return (
    <div className="glass-card overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
        <div>
          <h3 className="heading text-sm">Detail Per Bulan</h3>
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>
            {filtered.length} baris • klik header untuk mengurutkan
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search
              className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2"
              style={{ color: "var(--text-dim)" }}
            />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Cari tahun / bulan…"
              className="input pl-8"
            />
          </div>
          <button onClick={downloadCSV} className="btn-glass">
            <Download className="h-4 w-4" />
            <span className="hidden sm:inline">Ekspor CSV</span>
          </button>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full">
          <thead
            style={{
              background: "var(--bg-glass)",
              borderTop: "1px solid var(--border-subtle)",
              borderBottom: "1px solid var(--border-subtle)",
            }}
          >
            <tr>
              <Th k="year" label="Tahun" align="left" />
              <Th k="monthIdx" label="Bulan" align="left" />
              {visibleDepts.includes("NB") && <Th k="NB" label="NB" />}
              {visibleDepts.includes("PC") && <Th k="PC" label="PC" />}
              {visibleDepts.includes("JASA") && <Th k="JASA" label="JASA" />}
              <Th k="total" label="Grand Total" />
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr>
                <td
                  colSpan={3 + visibleDepts.length}
                  className="px-5 py-10 text-center text-sm"
                  style={{ color: "var(--text-muted)" }}
                >
                  Tidak ada data yang cocok.
                </td>
              </tr>
            )}
            {filtered.map((r) => (
              <tr
                key={`${r.year}-${r.monthIdx}`}
                style={{
                  borderBottom: "1px solid var(--border-subtle)",
                  transition: "background 0.15s",
                }}
              >
                <td
                  className="px-3 py-2 text-sm font-semibold"
                  style={{ color: "var(--tint-year-header)" }}
                >
                  {r.year}
                </td>
                <td
                  className="px-3 py-2 text-sm"
                  style={{ color: "var(--text-secondary)" }}
                >
                  {r.month}
                </td>
                {visibleDepts.includes("NB") && (
                  <td
                    className="px-3 py-2 text-right font-mono text-sm tabular-nums"
                    style={{ color: "var(--text-primary)" }}
                  >
                    {r.NB == null ? "—" : formatIDR(r.NB)}
                  </td>
                )}
                {visibleDepts.includes("PC") && (
                  <td
                    className="px-3 py-2 text-right font-mono text-sm tabular-nums"
                    style={{ color: "var(--text-primary)" }}
                  >
                    {r.PC == null ? "—" : formatIDR(r.PC)}
                  </td>
                )}
                {visibleDepts.includes("JASA") && (
                  <td
                    className="px-3 py-2 text-right font-mono text-sm tabular-nums"
                    style={{ color: "var(--text-primary)" }}
                  >
                    {r.JASA == null ? "—" : formatIDR(r.JASA)}
                  </td>
                )}
                <td
                  className="px-3 py-2 text-right font-mono text-sm font-semibold tabular-nums"
                  style={{ color: "var(--tint-share)" }}
                >
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
