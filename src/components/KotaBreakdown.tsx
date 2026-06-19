import { useMemo, useState } from "react";
import { ArrowUpDown, MapPin } from "lucide-react";
import {
  KOTA_NAMES,
  type KotaCode,
  type ParsedDataset,
  kotaTotalForYear,
} from "../lib/csvParser";
import { formatIDR, formatIDRCompact, classNames } from "../lib/format";

interface Props {
  data: ParsedDataset;
  year: number;
}

interface Row {
  kota: KotaCode;
  name: string;
  NB: number;
  PC: number;
  JASA: number;
  total: number;
  share: number;
  yoy: number | null;
}

type SortKey = keyof Pick<Row, "name" | "NB" | "PC" | "JASA" | "total" | "share" | "yoy">;

function formatPctID(n: number | null): string {
  if (n == null || !Number.isFinite(n)) return "—";
  const sign = n < 0 ? "-" : "";
  return `${sign}${Math.abs(n).toFixed(2).replace(".", ",")}%`;
}

function PctBadge({ value }: { value: number | null }) {
  if (value == null) {
    return <span style={{ color: "var(--text-dim)" }}>—</span>;
  }
  const positive = value >= 0;
  return (
    <span
      className="font-mono font-semibold tabular-nums"
      style={{ color: positive ? "var(--trend-up)" : "var(--trend-down)" }}
    >
      {formatPctID(value)}
    </span>
  );
}

const KOTA_TINT: Record<KotaCode, string> = {
  "G-YGY": "linear-gradient(135deg, #6366f1, #ec4899)",
  "G-SLO": "linear-gradient(135deg, #06b6d4, #6366f1)",
  "G-PWT": "linear-gradient(135deg, #f59e0b, #ec4899)",
  "G-BBS": "linear-gradient(135deg, #a855f7, #06b6d4)",
  "G-TGL": "linear-gradient(135deg, #10b981, #84cc16)",
  "G-MDN": "linear-gradient(135deg, #f43f5e, #f59e0b)",
  "G-SMG": "linear-gradient(135deg, #3b82f6, #8b5cf6)",
};

export function KotaBreakdown({ data, year }: Props) {
  const [sortKey, setSortKey] = useState<SortKey>("total");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const rows = useMemo<Row[]>(() => {
    const out: Row[] = [];
    const prevYear = year - 1;
    const hasPrev = data.years.includes(prevYear);

    let grandTotal = 0;
    const collected = data.kotas.map((k) => {
      const NB = kotaTotalForYear(data.pivotKota, year, k, "NB");
      const PC = kotaTotalForYear(data.pivotKota, year, k, "PC");
      const JASA = kotaTotalForYear(data.pivotKota, year, k, "JASA");
      const total = NB + PC + JASA;
      grandTotal += total;
      return { k, NB, PC, JASA, total };
    });

    for (const { k, NB, PC, JASA, total } of collected) {
      const share = grandTotal > 0 ? (total / grandTotal) * 100 : 0;
      const prevTotal = hasPrev
        ? kotaTotalForYear(data.pivotKota, prevYear, k)
        : 0;
      const yoy =
        hasPrev && prevTotal > 0
          ? ((total - prevTotal) / prevTotal) * 100
          : null;
      out.push({
        kota: k,
        name: KOTA_NAMES[k],
        NB,
        PC,
        JASA,
        total,
        share,
        yoy,
      });
    }
    return out;
  }, [data, year]);

  const sorted = useMemo(() => {
    const list = [...rows];
    list.sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];
      const an =
        typeof av === "number" ? av : av == null ? -Infinity : String(av);
      const bn =
        typeof bv === "number" ? bv : bv == null ? -Infinity : String(bv);
      let cmp: number;
      if (typeof an === "string" && typeof bn === "string") {
        cmp = an.localeCompare(bn);
      } else {
        cmp =
          (an as number) === (bn as number)
            ? 0
            : (an as number) > (bn as number)
              ? 1
              : -1;
      }
      return sortDir === "asc" ? cmp : -cmp;
    });
    return list;
  }, [rows, sortKey, sortDir]);

  const onSort = (k: SortKey) => {
    if (k === sortKey) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(k);
      setSortDir("desc");
    }
  };

  const grandTotal = rows.reduce((acc, r) => acc + r.total, 0);
  const maxShare = Math.max(...rows.map((r) => r.share), 1);

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
        "cursor-pointer select-none px-3 py-2.5 text-xs font-bold uppercase tracking-wider transition",
        align === "right" ? "text-right" : "text-left"
      )}
      style={{
        color: sortKey === k ? "var(--tint-year-header)" : "var(--text-dim)",
        background: "rgba(99, 102, 241, 0.08)",
        borderBottom: "1px solid var(--border-subtle)",
      }}
    >
      <span
        className={classNames(
          "inline-flex items-center gap-1",
          align === "right" && "flex-row-reverse"
        )}
      >
        {label}
        <ArrowUpDown
          className="h-3 w-3 transition"
          style={{
            color: sortKey === k ? "var(--tint-nb)" : "var(--text-dim)",
          }}
        />
      </span>
    </th>
  );

  return (
    <div className="overflow-x-auto rounded-xl">
      <table
        className="w-full min-w-[860px] text-sm"
        style={{
          borderCollapse: "separate",
          borderSpacing: 0,
          borderRadius: 12,
          overflow: "hidden",
        }}
      >
        <thead>
          <tr>
            <Th k="name" label="Kota" align="left" />
            <Th k="NB" label="NB" />
            <Th k="PC" label="PC" />
            <Th k="JASA" label="JASA" />
            <Th k="total" label="Total Omset" />
            <Th k="share" label="% Share" />
            <Th k="yoy" label="YoY" />
          </tr>
        </thead>
        <tbody>
          {sorted.map((r) => {
            const sharePct = (r.share / maxShare) * 100;
            return (
              <tr
                key={r.kota}
                style={{ borderBottom: "1px solid var(--border-subtle)" }}
              >
                <td className="px-3 py-3">
                  <div className="flex items-center gap-2.5">
                    <div
                      className="grid h-9 w-9 place-items-center rounded-xl text-white"
                      style={{
                        background: KOTA_TINT[r.kota],
                        boxShadow: "0 0 16px rgba(99,102,241,0.25)",
                      }}
                    >
                      <MapPin className="h-4 w-4" />
                    </div>
                    <div>
                      <div
                        className="font-display text-sm font-semibold"
                        style={{ color: "var(--text-primary)" }}
                      >
                        {r.name}
                      </div>
                      <div
                        className="font-mono text-[10px] uppercase tracking-wider"
                        style={{ color: "var(--text-dim)" }}
                      >
                        {r.kota}
                      </div>
                    </div>
                  </div>
                </td>
                <td
                  className="px-3 py-3 text-right font-mono tabular-nums"
                  style={{ color: "var(--tint-nb)" }}
                >
                  {formatIDRCompact(r.NB)}
                </td>
                <td
                  className="px-3 py-3 text-right font-mono tabular-nums"
                  style={{ color: "var(--tint-pc)" }}
                >
                  {formatIDRCompact(r.PC)}
                </td>
                <td
                  className="px-3 py-3 text-right font-mono tabular-nums"
                  style={{ color: "var(--tint-jasa)" }}
                >
                  {formatIDRCompact(r.JASA)}
                </td>
                <td
                  className="px-3 py-3 text-right font-mono font-semibold tabular-nums"
                  style={{ color: "var(--text-primary)" }}
                >
                  {formatIDR(r.total)}
                </td>
                <td className="px-3 py-3 text-right">
                  <div className="flex flex-col items-end gap-1">
                    <span
                      className="font-mono font-semibold tabular-nums"
                      style={{ color: "var(--tint-share)" }}
                    >
                      {r.share.toFixed(1)}%
                    </span>
                    <div
                      className="h-1.5 w-24 rounded-full"
                      style={{ background: "rgba(255,255,255,0.06)" }}
                    >
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${Math.min(100, sharePct)}%`,
                          background: KOTA_TINT[r.kota],
                        }}
                      />
                    </div>
                  </div>
                </td>
                <td className="px-3 py-3 text-right">
                  <PctBadge value={r.yoy} />
                </td>
              </tr>
            );
          })}
          <tr style={{ background: "rgba(99, 102, 241, 0.12)" }}>
            <td
              className="font-display px-3 py-3 text-left font-bold"
              style={{ color: "var(--text-primary)" }}
            >
              Total {year}
            </td>
            <td colSpan={3}></td>
            <td
              className="px-3 py-3 text-right font-mono font-bold tabular-nums"
              style={{ color: "var(--tint-share)" }}
            >
              {formatIDR(grandTotal)}
            </td>
            <td
              className="px-3 py-3 text-right font-mono tabular-nums"
              style={{ color: "var(--text-muted)" }}
            >
              100,0%
            </td>
            <td></td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
