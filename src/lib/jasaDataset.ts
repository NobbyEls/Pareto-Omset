import { useEffect, useState, useCallback } from "react";
import { parseIDNumber, MONTHS_ID, type MonthId } from "./format";

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

export interface JasaKotaSummary {
  cabang: string;
  jasaPart: number;
  jasaService: number;
  total: number;
  share: number;
}

export interface JasaMonthSummary {
  bulan: MonthId;
  bulanIndex: number;
  jasaPart: number;
  jasaService: number;
  total: number;
}

export interface JasaParsedData {
  records: JasaRecord[];
  cabangList: string[];
  months: MonthId[];
  /** Aggregated per kota (all months combined) */
  byKota: JasaKotaSummary[];
  /** Aggregated per month (all cities combined) */
  byMonth: JasaMonthSummary[];
  grandTotal: number;
}

/**
 * Parse the Jasa Breakdown CSV.
 * Structure:
 *   Col 0: Bulan (month name, or empty for header/separator rows)
 *   Col 1: Cabang (city name, "Cabang" for header, or "Grand Total")
 *   Col 2: Jasa Service type ("JASA PART" | "JASA SERVICE", empty for totals)
 *   Col 3: SUM of Jasa Fix (amount in Indonesian number format)
 */
export function parseJasaCSV(text: string): JasaParsedData {
  const lines = text.split("\n").map((l) => l.trim()).filter((l) => l.length > 0);
  const records: JasaRecord[] = [];
  const cabangSet = new Set<string>();
  const monthSet = new Set<MonthId>();

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

  const cabangList = Array.from(cabangSet).sort();
  const months = MONTHS_ID.filter((m) => monthSet.has(m));

  // Aggregate by kota
  const kotaMap = new Map<string, { jasaPart: number; jasaService: number }>();
  for (const r of records) {
    const entry = kotaMap.get(r.cabang) || { jasaPart: 0, jasaService: 0 };
    if (r.type === "JASA PART") entry.jasaPart += r.amount;
    else entry.jasaService += r.amount;
    kotaMap.set(r.cabang, entry);
  }

  const grandTotal = records.reduce((sum, r) => sum + r.amount, 0);

  const byKota: JasaKotaSummary[] = cabangList.map((cabang) => {
    const entry = kotaMap.get(cabang)!;
    const total = entry.jasaPart + entry.jasaService;
    return {
      cabang,
      jasaPart: entry.jasaPart,
      jasaService: entry.jasaService,
      total,
      share: grandTotal > 0 ? (total / grandTotal) * 100 : 0,
    };
  });

  // Sort by total descending
  byKota.sort((a, b) => b.total - a.total);

  // Aggregate by month
  const monthMap = new Map<MonthId, { jasaPart: number; jasaService: number }>();
  for (const r of records) {
    const entry = monthMap.get(r.bulan) || { jasaPart: 0, jasaService: 0 };
    if (r.type === "JASA PART") entry.jasaPart += r.amount;
    else entry.jasaService += r.amount;
    monthMap.set(r.bulan, entry);
  }

  const byMonth: JasaMonthSummary[] = months.map((bulan) => {
    const entry = monthMap.get(bulan)!;
    return {
      bulan,
      bulanIndex: MONTHS_ID.indexOf(bulan),
      jasaPart: entry.jasaPart,
      jasaService: entry.jasaService,
      total: entry.jasaPart + entry.jasaService,
    };
  });

  return { records, cabangList, months, byKota, byMonth, grandTotal };
}

export interface JasaDatasetState {
  data: JasaParsedData | null;
  loading: boolean;
  error: string | null;
}

/**
 * Hook to fetch and parse the Jasa Breakdown CSV.
 * Same retry logic as main dataset for IMPORTRANGE delays.
 */
export function useJasaDataset(): JasaDatasetState {
  const [data, setData] = useState<JasaParsedData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const doFetch = useCallback(() => {
    const controller = new AbortController();
    let retryCount = 0;
    const MAX_RETRIES = 3;
    const RETRY_DELAY = 3000;

    const attempt = () => {
      const url = `${JASA_CSV_URL}${JASA_CSV_URL.includes("?") ? "&" : "?"}_=${Date.now()}`;

      fetch(url, { signal: controller.signal, cache: "no-store" })
        .then((r) => {
          if (!r.ok) throw new Error(`HTTP ${r.status}`);
          return r.text();
        })
        .then((text) => {
          const parsed = parseJasaCSV(text);

          // If no records parsed (IMPORTRANGE not resolved), retry
          if (parsed.records.length === 0 && retryCount < MAX_RETRIES) {
            retryCount++;
            console.warn(
              `[Jasa] No data parsed, retrying in ${RETRY_DELAY / 1000}s ` +
                `(attempt ${retryCount}/${MAX_RETRIES})...`
            );
            setTimeout(attempt, RETRY_DELAY);
            return;
          }

          setData(parsed);
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
    attempt();

    return () => controller.abort();
  }, []);

  useEffect(() => {
    const cleanup = doFetch();
    return cleanup;
  }, [doFetch]);

  return { data, loading, error };
}
