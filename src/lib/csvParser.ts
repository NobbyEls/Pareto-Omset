import Papa from "papaparse";
import { MONTH_INDEX, MONTHS_ID, parseIDNumber } from "./format";

/**
 * Department categories that we recognize in the source sheet.
 * "Grand Total" is excluded from charts (it's a derived total) but kept available.
 */
export const DEPARTMENTS = ["NB", "PC", "JASA SERVICE", "JASA"] as const;
export type Department = (typeof DEPARTMENTS)[number];
export const ALL_CATEGORIES = [...DEPARTMENTS, "Grand Total"] as const;
export type Category = (typeof ALL_CATEGORIES)[number];

export interface SalesRecord {
  year: number;
  monthIndex: number; // 0..11
  monthName: string; // "Januari".."Desember"
  category: Category;
  value: number;
}

export interface ParsedDataset {
  records: SalesRecord[];
  years: number[];
  /** Map year -> month -> category -> value */
  pivot: Record<number, Record<number, Partial<Record<Category, number>>>>;
}

const KNOWN_CATEGORIES: ReadonlySet<string> = new Set(
  ALL_CATEGORIES.map((c) => c.toUpperCase())
);

function normalizeCategory(raw: string | null | undefined): Category | null {
  if (!raw) return null;
  const u = raw.trim().toUpperCase();
  if (!KNOWN_CATEGORIES.has(u)) return null;
  // Map back to canonical casing from ALL_CATEGORIES.
  for (const c of ALL_CATEGORIES) if (c.toUpperCase() === u) return c;
  return null;
}

function normalizeMonth(raw: string | null | undefined): number | null {
  if (!raw) return null;
  const idx = MONTH_INDEX[raw.trim().toLowerCase()];
  return idx == null ? null : idx;
}

/**
 * Detects which columns represent {month, dept, value} for each year.
 * Strategy: scan the first row for 4-digit year tokens; for every year found,
 * the next 3 columns (or the column index where the year sits + 0/1/2)
 * are treated as a year-block.
 *
 * The published sheet uses an "empty separator" column between groups,
 * so we don't assume a fixed stride — we trust whatever the header row says.
 */
interface YearBlock {
  year: number;
  monthCol: number;
  deptCol: number;
  valueCol: number;
}

function detectYearBlocks(headerRow: string[]): YearBlock[] {
  const blocks: YearBlock[] = [];
  for (let i = 0; i < headerRow.length; i++) {
    const cell = (headerRow[i] || "").trim();
    const m = cell.match(/^(20\d{2})$/);
    if (m) {
      const year = Number(m[1]);
      blocks.push({
        year,
        monthCol: i,
        deptCol: i + 1,
        valueCol: i + 2,
      });
    }
  }
  return blocks;
}

export function parseCSV(text: string): ParsedDataset {
  const res = Papa.parse<string[]>(text, {
    skipEmptyLines: false,
  });

  const rows = (res.data || []) as string[][];
  if (!rows.length) {
    return { records: [], years: [], pivot: {} };
  }

  const blocks = detectYearBlocks(rows[0] || []);
  const records: SalesRecord[] = [];
  const pivot: ParsedDataset["pivot"] = {};

  for (let r = 1; r < rows.length; r++) {
    const row = rows[r];
    if (!row) continue;

    for (const block of blocks) {
      const monthRaw = row[block.monthCol];
      const deptRaw = row[block.deptCol];
      const valueRaw = row[block.valueCol];

      const monthIdx = normalizeMonth(monthRaw);
      const cat = normalizeCategory(deptRaw);
      const value = parseIDNumber(valueRaw);

      if (monthIdx == null || cat == null || value == null) continue;

      const rec: SalesRecord = {
        year: block.year,
        monthIndex: monthIdx,
        monthName: MONTHS_ID[monthIdx],
        category: cat,
        value,
      };
      records.push(rec);

      if (!pivot[block.year]) pivot[block.year] = {};
      if (!pivot[block.year][monthIdx]) pivot[block.year][monthIdx] = {};
      pivot[block.year][monthIdx][cat] = value;
    }
  }

  const years = blocks.map((b) => b.year).sort((a, b) => a - b);
  return { records, years, pivot };
}

/**
 * Computed Grand Total for a given year+month.
 * Falls back to the explicit "Grand Total" row if present, otherwise
 * sums the four department buckets.
 */
export function totalFor(
  pivot: ParsedDataset["pivot"],
  year: number,
  monthIndex: number
): number | null {
  const m = pivot[year]?.[monthIndex];
  if (!m) return null;
  if (typeof m["Grand Total"] === "number") return m["Grand Total"]!;
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
