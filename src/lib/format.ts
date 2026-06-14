/**
 * Number / currency formatting helpers (Indonesian locale).
 */

export const MONTHS_ID = [
  "Januari",
  "Februari",
  "Maret",
  "April",
  "Mei",
  "Juni",
  "Juli",
  "Agustus",
  "September",
  "Oktober",
  "November",
  "Desember",
] as const;

export type MonthId = (typeof MONTHS_ID)[number];

export const MONTH_INDEX: Record<string, number> = MONTHS_ID.reduce(
  (acc, name, idx) => {
    acc[name.toLowerCase()] = idx;
    return acc;
  },
  {} as Record<string, number>
);

/**
 * Parses Indonesian number string where "." is the thousands separator
 * (and "," is decimal).
 *  e.g. "44.805.238.733" -> 44805238733
 *       "1.234,56"       -> 1234.56
 */
export function parseIDNumber(raw: string | number | null | undefined): number | null {
  if (raw == null) return null;
  if (typeof raw === "number") return Number.isFinite(raw) ? raw : null;
  const s = String(raw).trim();
  if (!s) return null;
  if (/loading/i.test(s)) return null;
  // Remove anything that is not digit, dot, comma, minus.
  const cleaned = s.replace(/[^0-9.,-]/g, "");
  if (!cleaned) return null;
  // Replace dot thousands separator, swap comma decimal -> dot decimal
  const normalized = cleaned.replace(/\./g, "").replace(/,/g, ".");
  const n = Number(normalized);
  return Number.isFinite(n) ? n : null;
}

const fmtIDR = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  maximumFractionDigits: 0,
});

const fmtIDNum = new Intl.NumberFormat("id-ID", {
  maximumFractionDigits: 0,
});

export function formatIDR(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return "—";
  return fmtIDR.format(n);
}

export function formatNumber(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return "—";
  return fmtIDNum.format(n);
}

/**
 * Compact Indonesian rupiah, e.g. 1.2 M (miliar), 950 Jt (juta).
 */
export function formatIDRCompact(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return "—";
  const abs = Math.abs(n);
  const sign = n < 0 ? "-" : "";
  if (abs >= 1_000_000_000_000)
    return `${sign}Rp ${(abs / 1_000_000_000_000).toFixed(2)} T`;
  if (abs >= 1_000_000_000)
    return `${sign}Rp ${(abs / 1_000_000_000).toFixed(2)} M`;
  if (abs >= 1_000_000) return `${sign}Rp ${(abs / 1_000_000).toFixed(1)} Jt`;
  if (abs >= 1_000) return `${sign}Rp ${(abs / 1_000).toFixed(1)} Rb`;
  return `${sign}Rp ${abs.toFixed(0)}`;
}

export function formatPercent(
  n: number | null | undefined,
  digits = 1
): string {
  if (n == null || !Number.isFinite(n)) return "—";
  return `${n >= 0 ? "+" : ""}${n.toFixed(digits)}%`;
}

export function classNames(
  ...xs: Array<string | false | null | undefined>
): string {
  return xs.filter(Boolean).join(" ");
}
