import Papa from "papaparse";
import { MONTH_INDEX, MONTHS_ID, parseIDNumber } from "./format";

/**
 * A single brand sales record from the brand analysis CSV.
 */
export interface BrandRecord {
  year: number;
  monthIndex: number; // 0..11
  monthName: string;
  department: string;
  brand: string;
  omset: number;
  percentage: number | null;
}

export interface BrandDataset {
  records: BrandRecord[];
  years: number[];
  departments: string[];
  brands: string[];
}

/**
 * Parse a percentage string in Indonesian format, e.g. "8,47%" -> 8.47
 */
function parsePercentage(raw: string | null | undefined): number | null {
  if (!raw) return null;
  const s = String(raw).trim().replace(/%/g, "").replace(/"/g, "");
  if (!s) return null;
  // Indonesian format uses comma as decimal separator
  const normalized = s.replace(/\./g, "").replace(/,/g, ".");
  const n = Number(normalized);
  return Number.isFinite(n) ? n : null;
}

/**
 * Detect month and year from a cell like "Januari 2026".
 */
function parseMonthYear(cell: string): { monthIndex: number; year: number } | null {
  if (!cell) return null;
  const trimmed = cell.trim();
  const parts = trimmed.split(/\s+/);
  if (parts.length !== 2) return null;
  const monthIdx = MONTH_INDEX[parts[0].toLowerCase()];
  if (monthIdx == null) return null;
  const yearMatch = parts[1].match(/^(20\d{2})$/);
  if (!yearMatch) return null;
  return { monthIndex: monthIdx, year: Number(yearMatch[1]) };
}

/**
 * Parse the brand analysis CSV.
 *
 * Structure:
 * - Blocks separated by empty rows
 * - Header row: "Januari 2025,Departemen,Brand,Omset,%,,Januari 2026,Departemen,Brand,Omset,%"
 * - Data rows: "Januari 2025,LAPTOP,ACER,,,,Januari 2026,LAPTOP,ACER,5.913.343.000,"8,47%""
 * - Only the RIGHT year block has populated Omset/% values
 */
export function parseBrandCSV(text: string): BrandDataset {
  const res = Papa.parse<string[]>(text, { skipEmptyLines: false });
  const rows = (res.data || []) as string[][];

  if (!rows.length) {
    return { records: [], years: [], departments: [], brands: [] };
  }

  const records: BrandRecord[] = [];
  const yearsSet = new Set<number>();
  const departmentsSet = new Set<string>();
  const brandsSet = new Set<string>();

  // Process each row
  for (let r = 0; r < rows.length; r++) {
    const row = rows[r];
    if (!row || row.length < 5) continue;

    // Try to parse records from both left side (cols 0-4) and right side (cols 6-10)
    // Left side: cols 0(month+year), 1(dept), 2(brand), 3(omset), 4(%)
    // Right side: cols 6(month+year), 7(dept), 8(brand), 9(omset), 10(%)

    const sides = [
      { monthYearCol: 0, deptCol: 1, brandCol: 2, omsetCol: 3, pctCol: 4 },
      { monthYearCol: 6, deptCol: 7, brandCol: 8, omsetCol: 9, pctCol: 10 },
    ];

    for (const side of sides) {
      if (side.monthYearCol >= row.length) continue;

      const monthYearCell = (row[side.monthYearCol] || "").trim();
      const parsed = parseMonthYear(monthYearCell);
      if (!parsed) continue;

      const dept = (row[side.deptCol] || "").trim();
      const brand = (row[side.brandCol] || "").trim();
      const omsetRaw = row[side.omsetCol];
      const pctRaw = row[side.pctCol];

      // Skip header-like rows (where dept is "Departemen")
      if (!dept || dept.toLowerCase() === "departemen") continue;
      if (!brand || brand.toLowerCase() === "brand") continue;

      const omset = parseIDNumber(omsetRaw);
      if (omset == null) continue; // Skip rows without omset data

      const percentage = parsePercentage(pctRaw);

      records.push({
        year: parsed.year,
        monthIndex: parsed.monthIndex,
        monthName: MONTHS_ID[parsed.monthIndex],
        department: dept,
        brand,
        omset,
        percentage,
      });

      yearsSet.add(parsed.year);
      departmentsSet.add(dept);
      brandsSet.add(brand);
    }
  }

  const years = Array.from(yearsSet).sort((a, b) => a - b);
  const departments = Array.from(departmentsSet).sort();
  const brands = Array.from(brandsSet).sort();

  return { records, years, departments, brands };
}
