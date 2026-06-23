import { useEffect, useState, useCallback } from "react";
import { parseIDNumber, MONTHS_ID, MONTH_INDEX, type MonthId } from "./format";
import { getWebAppUrl } from "./dataset";
import type { KotaCode } from "./csvParser";
import { setDataDate, parseDateDDMMYYYY } from "./estimation";

/**
 * Jasa Breakdown CSV URL (gid=1300836220).
 * Contains monthly JASA PART / JASA SERVICE per kota.
 */
export const JASA_CSV_URL =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vTXIuWnOk4-NoraIjEfqp0vDZCnKhqiklrskW_rfJxQatuPtohbwKtcz5TDTwuq7DW3HmzXAa_q2RqI/pub?gid=1300836220&single=true&output=csv";

export type JasaType = "JASA PART" | "JASA SERVICE";

export interface JasaRecord {
  bulan: MonthId;
  bulanIndex: number;
  cabang: string;
  type: JasaType;
  amount: number;
}

export interface JasaSalesRecord {
  bulan: MonthId;
  bulanIndex: number;
  cabang: string;
  amount: number;
  year: number;
}

export interface JasaKotaSummary {
  cabang: string;
  jasaPart: number;
  jasaService: number;
  jasaSales: number;
  total: number;
  share: number;
}

export interface JasaMonthSummary {
  bulan: MonthId;
  bulanIndex: number;
  jasaPart: number;
  jasaService: number;
  jasaSales: number;
  total: number;
}

export interface JasaParsedData {
  records: JasaRecord[];
  jasaSalesRecords: JasaSalesRecord[];
  cabangList: string[];
  months: MonthId[];
  /** Aggregated per kota (all months combined) */
  byKota: JasaKotaSummary[];
  /** Aggregated per month (all cities combined) */
  byMonth: JasaMonthSummary[];
  grandTotal: number;
}

/**
 * Mapping from kota codes (G-XXX) in the main database to the city names
 * used in the Jasa CSV sheet. Exported so other modules (e.g. the
 * filter-aware Jasa breakdown) can convert a `KotaCode` filter selection
 * into the matching `cabang` string.
 */
export const KOTA_CODE_TO_NAME: Record<KotaCode, string> = {
  "G-YGY": "YOGYAKARTA",
  "G-SLO": "SOLO",
  "G-PWT": "PURWOKERTO",
  "G-BBS": "BABARSARI",
  "G-TGL": "TEGAL",
  "G-MDN": "MADIUN",
  "G-SMG": "SEMARANG",
};

/**
 * Parse "Jasa Sales" records from the main database (Web App JSON response).
 * The database field is a 2D array with 12 cols: 4 cols per year-block
 * (Bulan, KotaCode, Dept, Amount) x 3 years.
 * We filter for rows where Dept = "JASA" (exact, case-insensitive).
 */
export function parseJasaSalesFromDatabase(database: string[][]): JasaSalesRecord[] {
  if (!database || database.length < 2) return [];

  const records: JasaSalesRecord[] = [];

  // Detect year blocks from header row
  const headerRow = database[0] || [];
  const yearBlocks: { year: number; col: number }[] = [];
  for (let i = 0; i < headerRow.length; i++) {
    const cell = String(headerRow[i] || "").trim();
    const m = cell.match(/^(20\d{2})$/);
    if (m) yearBlocks.push({ col: i, year: Number(m[1]) });
  }

  if (yearBlocks.length === 0) return [];

  // Determine layout: 4-col (with kota) per year-block
  // Each block: [Bulan, Kota, Dept, Amount]
  for (let r = 1; r < database.length; r++) {
    const row = database[r];
    if (!row) continue;

    for (const block of yearBlocks) {
      const bulanRaw = String(row[block.col] || "").trim();
      const kotaRaw = String(row[block.col + 1] || "").trim().toUpperCase();
      const deptRaw = String(row[block.col + 2] || "").trim().toUpperCase();
      const amountRaw = row[block.col + 3];

      // Skip if no month
      if (!bulanRaw) continue;

      // Must be exactly "JASA" (not "JASA SERVICE")
      if (deptRaw !== "JASA") continue;

      // Validate month
      const monthIndex = MONTH_INDEX[bulanRaw.toLowerCase()];
      if (monthIndex == null) continue;

      // Map kota code to name
      const cabang = (KOTA_CODE_TO_NAME as Record<string, string | undefined>)[kotaRaw];
      if (!cabang) continue;

      const amount = parseIDNumber(amountRaw);
      if (amount == null || amount === 0) continue;

      records.push({
        bulan: MONTHS_ID[monthIndex],
        bulanIndex: monthIndex,
        cabang,
        amount,
        year: block.year,
      });
    }
  }

  return records;
}

/**
 * Parse the Jasa Breakdown CSV.
 * Structure:
 *   Col 0: Bulan (month name, or empty for header/separator rows)
 *   Col 1: Cabang (city name, "Cabang" for header, or "Grand Total")
 *   Col 2: Jasa Service type ("JASA PART" | "JASA SERVICE", empty for totals)
 *   Col 3: SUM of Jasa Fix (amount in Indonesian number format)
 *
 * @param jasaSalesRecords - Optional records from the main database for "Jasa Sales"
 */
export function parseJasaCSV(text: string, jasaSalesRecords: JasaSalesRecord[] = []): JasaParsedData {
  const lines = text.split("\n").map((l) => l.trim()).filter((l) => l.length > 0);
  const records: JasaRecord[] = [];
  const cabangSet = new Set<string>();
  const monthSet = new Set<MonthId>();

  // Extract "last data date" from header row cell E1 (column index 4).
  // Format: DD/MM/YYYY (e.g. "22/06/2026")
  if (lines.length > 0) {
    const headerCols = lines[0].split(",");
    if (headerCols.length > 4) {
      const dateStr = headerCols[4].trim();
      const parsed = parseDateDDMMYYYY(dateStr);
      if (parsed) {
        setDataDate(parsed);
        console.log(
          `[Pareto] Tanggal estimasi dari E1: ${dateStr} → ${parsed.toLocaleDateString("id-ID")}`
        );
      }
    }
  }

  for (const line of lines) {
    // Simple CSV split (no quoted commas in this dataset)
    const cols = line.split(",");
    if (cols.length < 4) continue;

    const bulanRaw = cols[0].trim();
    const cabang = cols[1].trim();
    const jasaType = cols[2].trim();
    const amountRaw = cols[3].trim();

    // Skip header rows, "Total" rows, "Grand Total" rows, and empty/separator lines
    if (!bulanRaw) continue;
    if (cabang === "Cabang" || cabang === "") continue;
    if (cabang.endsWith("Total") || cabang === "Grand Total") continue;
    if (jasaType !== "JASA PART" && jasaType !== "JASA SERVICE") continue;

    // Validate month
    const monthIndex = MONTHS_ID.findIndex(
      (m) => m.toLowerCase() === bulanRaw.toLowerCase()
    );
    if (monthIndex < 0) continue;

    const amount = parseIDNumber(amountRaw);
    if (amount == null || amount === 0) continue;

    const bulan = MONTHS_ID[monthIndex];
    records.push({
      bulan,
      bulanIndex: monthIndex,
      cabang,
      type: jasaType as JasaType,
      amount,
    });
    cabangSet.add(cabang);
    monthSet.add(bulan);
  }

  // Also add cabang from jasaSalesRecords to get combined lists
  for (const r of jasaSalesRecords) {
    cabangSet.add(r.cabang);
    monthSet.add(r.bulan);
  }
  const allCabangList = Array.from(cabangSet).sort();
  const allMonths = MONTHS_ID.filter((m) => monthSet.has(m));

  // Aggregate by kota
  const kotaMap = new Map<string, { jasaPart: number; jasaService: number; jasaSales: number }>();
  for (const r of records) {
    const entry = kotaMap.get(r.cabang) || { jasaPart: 0, jasaService: 0, jasaSales: 0 };
    if (r.type === "JASA PART") entry.jasaPart += r.amount;
    else entry.jasaService += r.amount;
    kotaMap.set(r.cabang, entry);
  }
  for (const r of jasaSalesRecords) {
    const entry = kotaMap.get(r.cabang) || { jasaPart: 0, jasaService: 0, jasaSales: 0 };
    entry.jasaSales += r.amount;
    kotaMap.set(r.cabang, entry);
  }

  const grandTotal = records.reduce((sum, r) => sum + r.amount, 0)
    + jasaSalesRecords.reduce((sum, r) => sum + r.amount, 0);

  const byKota: JasaKotaSummary[] = allCabangList.map((cabang) => {
    const entry = kotaMap.get(cabang) || { jasaPart: 0, jasaService: 0, jasaSales: 0 };
    const total = entry.jasaPart + entry.jasaService + entry.jasaSales;
    return {
      cabang,
      jasaPart: entry.jasaPart,
      jasaService: entry.jasaService,
      jasaSales: entry.jasaSales,
      total,
      share: grandTotal > 0 ? (total / grandTotal) * 100 : 0,
    };
  });

  // Sort by total descending
  byKota.sort((a, b) => b.total - a.total);

  // Aggregate by month
  const monthMap = new Map<MonthId, { jasaPart: number; jasaService: number; jasaSales: number }>();
  for (const r of records) {
    const entry = monthMap.get(r.bulan) || { jasaPart: 0, jasaService: 0, jasaSales: 0 };
    if (r.type === "JASA PART") entry.jasaPart += r.amount;
    else entry.jasaService += r.amount;
    monthMap.set(r.bulan, entry);
  }
  for (const r of jasaSalesRecords) {
    const entry = monthMap.get(r.bulan) || { jasaPart: 0, jasaService: 0, jasaSales: 0 };
    entry.jasaSales += r.amount;
    monthMap.set(r.bulan, entry);
  }

  const byMonth: JasaMonthSummary[] = allMonths.map((bulan) => {
    const entry = monthMap.get(bulan) || { jasaPart: 0, jasaService: 0, jasaSales: 0 };
    return {
      bulan,
      bulanIndex: MONTHS_ID.indexOf(bulan),
      jasaPart: entry.jasaPart,
      jasaService: entry.jasaService,
      jasaSales: entry.jasaSales,
      total: entry.jasaPart + entry.jasaService + entry.jasaSales,
    };
  });

  return { records, jasaSalesRecords, cabangList: allCabangList, months: allMonths, byKota, byMonth, grandTotal };
}

/**
 * Aggregate already-parsed `JasaRecord[]` + `JasaSalesRecord[]` arrays into
 * the same `byKota` / `byMonth` / `grandTotal` shape used by `parseJasaCSV`.
 * Used by the filter-aware breakdown view: the raw records are filtered
 * (by year / kota) first and then re-aggregated through this helper so
 * every chart and table updates in lock-step with the global filter bar.
 */
export function aggregateJasaRecords(
  records: JasaRecord[],
  jasaSalesRecords: JasaSalesRecord[]
): {
  byKota: JasaKotaSummary[];
  byMonth: JasaMonthSummary[];
  cabangList: string[];
  months: MonthId[];
  grandTotal: number;
} {
  const cabangSet = new Set<string>();
  const monthSet = new Set<MonthId>();

  for (const r of records) {
    cabangSet.add(r.cabang);
    monthSet.add(r.bulan);
  }
  for (const r of jasaSalesRecords) {
    cabangSet.add(r.cabang);
    monthSet.add(r.bulan);
  }

  const cabangList = Array.from(cabangSet).sort();
  const months = MONTHS_ID.filter((m) => monthSet.has(m));

  const kotaMap = new Map<
    string,
    { jasaPart: number; jasaService: number; jasaSales: number }
  >();
  for (const r of records) {
    const entry =
      kotaMap.get(r.cabang) || { jasaPart: 0, jasaService: 0, jasaSales: 0 };
    if (r.type === "JASA PART") entry.jasaPart += r.amount;
    else entry.jasaService += r.amount;
    kotaMap.set(r.cabang, entry);
  }
  for (const r of jasaSalesRecords) {
    const entry =
      kotaMap.get(r.cabang) || { jasaPart: 0, jasaService: 0, jasaSales: 0 };
    entry.jasaSales += r.amount;
    kotaMap.set(r.cabang, entry);
  }

  const grandTotal =
    records.reduce((s, r) => s + r.amount, 0) +
    jasaSalesRecords.reduce((s, r) => s + r.amount, 0);

  const byKota: JasaKotaSummary[] = cabangList
    .map((cabang) => {
      const entry =
        kotaMap.get(cabang) || { jasaPart: 0, jasaService: 0, jasaSales: 0 };
      const total = entry.jasaPart + entry.jasaService + entry.jasaSales;
      return {
        cabang,
        jasaPart: entry.jasaPart,
        jasaService: entry.jasaService,
        jasaSales: entry.jasaSales,
        total,
        share: grandTotal > 0 ? (total / grandTotal) * 100 : 0,
      };
    })
    .sort((a, b) => b.total - a.total);

  const monthMap = new Map<
    MonthId,
    { jasaPart: number; jasaService: number; jasaSales: number }
  >();
  for (const r of records) {
    const entry =
      monthMap.get(r.bulan) || { jasaPart: 0, jasaService: 0, jasaSales: 0 };
    if (r.type === "JASA PART") entry.jasaPart += r.amount;
    else entry.jasaService += r.amount;
    monthMap.set(r.bulan, entry);
  }
  for (const r of jasaSalesRecords) {
    const entry =
      monthMap.get(r.bulan) || { jasaPart: 0, jasaService: 0, jasaSales: 0 };
    entry.jasaSales += r.amount;
    monthMap.set(r.bulan, entry);
  }

  const byMonth: JasaMonthSummary[] = months.map((bulan) => {
    const entry =
      monthMap.get(bulan) || { jasaPart: 0, jasaService: 0, jasaSales: 0 };
    return {
      bulan,
      bulanIndex: MONTHS_ID.indexOf(bulan),
      jasaPart: entry.jasaPart,
      jasaService: entry.jasaService,
      jasaSales: entry.jasaSales,
      total: entry.jasaPart + entry.jasaService + entry.jasaSales,
    };
  });

  return { byKota, byMonth, cabangList, months, grandTotal };
}

export interface JasaDatasetState {
  data: JasaParsedData | null;
  loading: boolean;
  error: string | null;
  fromCache: boolean;
  updateData: () => void;
}

const JASA_CACHE_KEY = "pareto-jasa-cache";
const JASA_CACHE_TS_KEY = "pareto-jasa-cache-ts";
const JASA_SALES_CACHE_KEY = "pareto-jasa-sales-cache";

function saveJasaCache(text: string): void {
  try {
    localStorage.setItem(JASA_CACHE_KEY, text);
    localStorage.setItem(JASA_CACHE_TS_KEY, new Date().toISOString());
  } catch (_) {}
}

function saveJasaSalesCache(records: JasaSalesRecord[]): void {
  try {
    localStorage.setItem(JASA_SALES_CACHE_KEY, JSON.stringify(records));
  } catch (_) {}
}

/**
 * Fetch main database from the Web App and extract Jasa Sales records.
 */
async function fetchJasaSalesFromWebApp(signal: AbortSignal): Promise<JasaSalesRecord[]> {
  const webAppUrl = getWebAppUrl();
  if (!webAppUrl) return [];

  const url = `${webAppUrl}${webAppUrl.includes("?") ? "&" : "?"}t=${Date.now()}`;
  const res = await fetch(url, { signal, cache: "no-store" });
  if (!res.ok) throw new Error(`Web App HTTP ${res.status}`);
  const json = (await res.json()) as { database?: string[][]; error?: string };
  if (json.error) throw new Error(`Web App error: ${json.error}`);
  if (!json.database) return [];

  return parseJasaSalesFromDatabase(json.database);
}

/**
 * Hook to fetch and parse the Jasa Breakdown CSV + Jasa Sales from Web App.
 * Uses localStorage cache -- only re-fetches when user triggers updateData().
 */
export function useJasaDataset(): JasaDatasetState {
  const [data, setData] = useState<JasaParsedData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fromCache, setFromCache] = useState(false);
  const [forceUpdate, setForceUpdate] = useState(0);

  const updateData = useCallback(() => setForceUpdate((t) => t + 1), []);

  // On mount: always fetch fresh data (no cache on initial load).
  useEffect(() => {
    setForceUpdate(1);
  }, []);

  // Network fetch
  useEffect(() => {
    if (forceUpdate === 0) return;

    const controller = new AbortController();
    let retryCount = 0;
    const MAX_RETRIES = 3;
    const RETRY_DELAY = 3000;

    const attempt = () => {
      const url = `${JASA_CSV_URL}${JASA_CSV_URL.includes("?") ? "&" : "?"}_=${Date.now()}`;

      // Fetch both Jasa CSV and Jasa Sales from Web App in parallel
      Promise.all([
        fetch(url, { signal: controller.signal, cache: "no-store" })
          .then((r) => {
            if (!r.ok) throw new Error(`HTTP ${r.status}`);
            return r.text();
          }),
        fetchJasaSalesFromWebApp(controller.signal).catch((e) => {
          console.warn("[Jasa] Failed to fetch Jasa Sales from Web App:", e);
          return [] as JasaSalesRecord[];
        }),
      ])
        .then(([text, jasaSalesRecords]) => {
          const parsed = parseJasaCSV(text, jasaSalesRecords);

          if (parsed.records.length === 0 && retryCount < MAX_RETRIES) {
            retryCount++;
            console.warn(
              `[Jasa] No data parsed, retrying in ${RETRY_DELAY / 1000}s ` +
                `(attempt ${retryCount}/${MAX_RETRIES})...`
            );
            setTimeout(attempt, RETRY_DELAY);
            return;
          }

          if (parsed.records.length > 0) {
            saveJasaCache(text);
          }
          if (jasaSalesRecords.length > 0) {
            saveJasaSalesCache(jasaSalesRecords);
          }

          setData(parsed);
          setFromCache(false);
          setLoading(false);
        })
        .catch((e) => {
          if ((e as Error).name === "AbortError") return;
          setError((e as Error).message || "Gagal memuat data Jasa");
          setLoading(false);
        });
    };

    setLoading(true);
    setError(null);
    setFromCache(false);
    attempt();

    return () => controller.abort();
  }, [forceUpdate]);

  return { data, loading, error, fromCache, updateData };
}
