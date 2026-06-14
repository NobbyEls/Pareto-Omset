import Papa from "papaparse";
import { MONTH_INDEX, MONTHS_ID, parseIDNumber } from "./format";

/**
 * Department categories.  Source rows labelled "JASA SERVICE" are folded
 * into "JASA" via {@link CATEGORY_ALIAS}.
 */
export const DEPARTMENTS = ["NB", "PC", "JASA"] as const;
export type Department = (typeof DEPARTMENTS)[number];
export const ALL_CATEGORIES = [...DEPARTMENTS, "Grand Total"] as const;
export type Category = (typeof ALL_CATEGORIES)[number];

/**
 * Branch / kota codes from the source sheet (G-XXX format).
 */
export const KOTA_CODES = [
  "G-YGY",
  "G-SLO",
  "G-PWT",
  "G-BBS",
  "G-TGL",
  "G-MDN",
  "G-SMG",
] as const;
export type KotaCode = (typeof KOTA_CODES)[number];

/** Human-readable names for each branch code. */
export const KOTA_NAMES: Record<KotaCode, string> = {
  "G-YGY": "Yogyakarta",
  "G-SLO": "Solo",
  "G-PWT": "Purwokerto",
  "G-BBS": "Babarsari",
  "G-TGL": "Tegal",
  "G-MDN": "Madiun",
  "G-SMG": "Semarang",
};

const KOTA_SET: Set<string> = new Set(KOTA_CODES);

const CATEGORY_ALIAS: Record<string, Category> = {
  NB: "NB",
  PC: "PC",
  JASA: "JASA",
  "JASA SERVICE": "JASA",
  "GRAND TOTAL": "Grand Total",
};

export interface SalesRecord {
  year: number;
  monthIndex: number; // 0..11
  monthName: string;
  category: Category;
  kota: KotaCode | null;
  value: number;
}

export interface ParsedDataset {
  records: SalesRecord[];
  years: number[];
  /** Map year -> month -> category -> aggregated value (across all kota). */
  pivot: Record<number, Record<number, Partial<Record<Category, number>>>>;
  /** Map year -> month -> kota -> category -> value. */
  pivotKota: Record<
    number,
    Record<number, Partial<Record<KotaCode, Partial<Record<Category, number>>>>>
  >;
  /** Branch codes that actually appear in the data, in canonical order. */
  kotas: KotaCode[];
}

function normalizeCategory(raw: string | null | undefined): Category | null {
  if (!raw) return null;
  const u = raw.trim().toUpperCase();
  return CATEGORY_ALIAS[u] ?? null;
}

function normalizeMonth(raw: string | null | undefined): number | null {
  if (!raw) return null;
  const idx = MONTH_INDEX[raw.trim().toLowerCase()];
  return idx == null ? null : idx;
}

function normalizeKota(raw: string | null | undefined): KotaCode | null {
  if (!raw) return null;
  const u = raw.trim().toUpperCase();
  if (KOTA_SET.has(u)) return u as KotaCode;
  return null;
}

interface YearBlock {
  year: number;
  monthCol: number;
  /** -1 when the source has no kota/cabang column (legacy 3-col format). */
  kotaCol: number;
  deptCol: number;
  valueCol: number;
}

/**
 * Year blocks are detected by scanning the first row for 4-digit year tokens
 * (e.g. "2024"). The sub-header row is then inspected to decide between the
 * 3-column legacy format (month | dept | value) and the newer 4-column format
 * that adds a kota column (month | kota | dept | value).
 */
function detectYearBlocks(
  headerRow: string[],
  subHeaderRow: string[]
): YearBlock[] {
  const blocks: YearBlock[] = [];
  for (let i = 0; i < headerRow.length; i++) {
    const cell = (headerRow[i] || "").trim();
    const m = cell.match(/^(20\d{2})$/);
    if (!m) continue;
    const year = Number(m[1]);
    const nextLabel = (subHeaderRow[i + 1] || "").trim().toLowerCase();
    const isKotaCol =
      nextLabel === "cabang" ||
      nextLabel === "kode gudang" ||
      nextLabel === "kota";
    if (isKotaCol) {
      blocks.push({
        year,
        monthCol: i,
        kotaCol: i + 1,
        deptCol: i + 2,
        valueCol: i + 3,
      });
    } else {
      blocks.push({
        year,
        monthCol: i,
        kotaCol: -1,
        deptCol: i + 1,
        valueCol: i + 2,
      });
    }
  }
  return blocks;
}

export function parseCSV(text: string): ParsedDataset {
  const res = Papa.parse<string[]>(text, { skipEmptyLines: false });
  const rows = (res.data || []) as string[][];
  if (!rows.length) {
    return {
      records: [],
      years: [],
      pivot: {},
      pivotKota: {},
      kotas: [],
    };
  }

  const blocks = detectYearBlocks(rows[0] || [], rows[1] || []);
  const records: SalesRecord[] = [];
  const pivot: ParsedDataset["pivot"] = {};
  const pivotKota: ParsedDataset["pivotKota"] = {};
  const kotaSeen = new Set<KotaCode>();

  for (let r = 1; r < rows.length; r++) {
    const row = rows[r];
    if (!row) continue;

    for (const block of blocks) {
      const monthIdx = normalizeMonth(row[block.monthCol]);
      const cat = normalizeCategory(row[block.deptCol]);
      const value = parseIDNumber(row[block.valueCol]);
      if (monthIdx == null || cat == null || value == null) continue;

      const kota =
        block.kotaCol >= 0 ? normalizeKota(row[block.kotaCol]) : null;

      // For 4-col rows the kota column must resolve to a known branch.
      // Anything else (e.g. "G-PWT Total", "PURWOKERTO Total", "Grand Total")
      // is a subtotal row and should be skipped to avoid double-counting.
      if (block.kotaCol >= 0 && kota == null) continue;
      // Grand Total rows for legacy 3-col format are skipped here too —
      // we always re-derive totals from the dept buckets.
      if (cat === "Grand Total") continue;

      records.push({
        year: block.year,
        monthIndex: monthIdx,
        monthName: MONTHS_ID[monthIdx],
        category: cat,
        kota,
        value,
      });

      if (kota) kotaSeen.add(kota);

      if (!pivot[block.year]) pivot[block.year] = {};
      if (!pivot[block.year][monthIdx]) pivot[block.year][monthIdx] = {};
      const cell = pivot[block.year][monthIdx];
      cell[cat] = (cell[cat] ?? 0) + value;

      if (kota) {
        if (!pivotKota[block.year]) pivotKota[block.year] = {};
        if (!pivotKota[block.year][monthIdx])
          pivotKota[block.year][monthIdx] = {};
        if (!pivotKota[block.year][monthIdx][kota])
          pivotKota[block.year][monthIdx][kota] = {};
        const kc = pivotKota[block.year][monthIdx][kota]!;
        kc[cat] = (kc[cat] ?? 0) + value;
      }
    }
  }

  const years = blocks.map((b) => b.year).sort((a, b) => a - b);
  const kotas = KOTA_CODES.filter((k) => kotaSeen.has(k));
  return { records, years, pivot, pivotKota, kotas };
}

/* ===== Aggregate helpers (work on `pivot`) ===== */

export function totalFor(
  pivot: ParsedDataset["pivot"],
  year: number,
  monthIndex: number
): number | null {
  const m = pivot[year]?.[monthIndex];
  if (!m) return null;
  let sum = 0;
  let any = false;
  for (const d of DEPARTMENTS) {
    const v = m[d];
    if (typeof v === "number") {
      sum += v;
      any = true;
    }
  }
  return any ? sum : null;
}

export function totalForYear(
  pivot: ParsedDataset["pivot"],
  year: number
): number {
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    const v = totalFor(pivot, year, i);
    if (v != null) sum += v;
  }
  return sum;
}

export function deptTotalForYear(
  pivot: ParsedDataset["pivot"],
  year: number,
  dept: Department
): number {
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    const v = pivot[year]?.[i]?.[dept];
    if (typeof v === "number") sum += v;
  }
  return sum;
}

/* ===== Per-kota helpers ===== */

export function kotaMonthValue(
  pivotKota: ParsedDataset["pivotKota"],
  year: number,
  monthIndex: number,
  kota: KotaCode,
  dept?: Department
): number | null {
  const cell = pivotKota[year]?.[monthIndex]?.[kota];
  if (!cell) return null;
  if (dept) {
    return typeof cell[dept] === "number" ? cell[dept]! : null;
  }
  let sum = 0;
  let any = false;
  for (const d of DEPARTMENTS) {
    const v = cell[d];
    if (typeof v === "number") {
      sum += v;
      any = true;
    }
  }
  return any ? sum : null;
}

export function kotaTotalForYear(
  pivotKota: ParsedDataset["pivotKota"],
  year: number,
  kota: KotaCode,
  dept?: Department
): number {
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    const v = kotaMonthValue(pivotKota, year, i, kota, dept);
    if (v != null) sum += v;
  }
  return sum;
}

/**
 * Project the per-kota cube down to a single-kota pivot. When `kota` is
 * `"all"`, returns the pre-aggregated `pivot` directly.
 *
 * The result has the exact same shape as `ParsedDataset.pivot`, so every
 * existing chart / table component can stay as-is.
 */
export function pivotForKota(
  data: ParsedDataset,
  kota: KotaCode | "all"
): ParsedDataset["pivot"] {
  if (kota === "all") return data.pivot;
  const out: ParsedDataset["pivot"] = {};
  for (const yStr of Object.keys(data.pivotKota)) {
    const y = Number(yStr);
    out[y] = {};
    const months = data.pivotKota[y];
    for (const mStr of Object.keys(months)) {
      const mi = Number(mStr);
      const cell = months[mi]?.[kota];
      if (cell) {
        out[y][mi] = { ...cell };
      }
    }
  }
  return out;
}
