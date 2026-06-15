import { useEffect, useState, useCallback } from "react";
import { parseCSV, type ParsedDataset } from "./csvParser";

export const DEFAULT_CSV_URL =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vTXIuWnOk4-NoraIjEfqp0vDZCnKhqiklrskW_rfJxQatuPtohbwKtcz5TDTwuq7DW3HmzXAa_q2RqI/pub?gid=1311218554&single=true&output=csv";

const CACHE_KEY = "pareto-omset-cache";
const CACHE_TS_KEY = "pareto-omset-cache-ts";

export interface DatasetState {
  data: ParsedDataset | null;
  loading: boolean;
  error: string | null;
  fetchedAt: Date | null;
  /** True when using cached data (not a fresh fetch). */
  fromCache: boolean;
  /** Force-fetch fresh data from Google Sheets (bypasses cache). */
  updateData: () => void;
}

/** Try to load cached CSV text from localStorage. */
function loadCache(): { text: string; ts: Date } | null {
  try {
    const text = localStorage.getItem(CACHE_KEY);
    const tsStr = localStorage.getItem(CACHE_TS_KEY);
    if (text && tsStr) {
      return { text, ts: new Date(tsStr) };
    }
  } catch (_) {
    // localStorage unavailable or corrupt
  }
  return null;
}

/** Save CSV text to localStorage with timestamp. */
function saveCache(text: string): void {
  try {
    localStorage.setItem(CACHE_KEY, text);
    localStorage.setItem(CACHE_TS_KEY, new Date().toISOString());
  } catch (_) {
    // quota exceeded or unavailable — ignore
  }
}

/**
 * Dataset hook with localStorage caching.
 *
 * Behavior:
 * 1. On first load: try localStorage cache → if valid, use it instantly (no network)
 * 2. User clicks "Update Data" → fresh-fetch from Google Sheets, save to cache
 * 3. If no cache exists on first load → auto-fetch from network
 * 4. Retry logic for IMPORTRANGE delays (up to 3 retries with 3s delay)
 */
export function useDataset(): DatasetState {
  const [data, setData] = useState<ParsedDataset | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fetchedAt, setFetchedAt] = useState<Date | null>(null);
  const [fromCache, setFromCache] = useState(false);
  const [forceUpdate, setForceUpdate] = useState(0);

  const updateData = useCallback(() => setForceUpdate((t) => t + 1), []);

  // On mount: try cache first
  useEffect(() => {
    const cached = loadCache();
    if (cached) {
      const parsed = parseCSV(cached.text);
      if (parsed.years.length > 0 && parsed.records.length > 0) {
        setData(parsed);
        setFetchedAt(cached.ts);
        setFromCache(true);
        setLoading(false);
        console.log(
          `[Pareto] Loaded from cache (${parsed.years.length} years, ` +
            `${parsed.records.length} records, cached at ${cached.ts.toLocaleString()})`
        );
        return;
      }
    }
    // No valid cache — trigger network fetch
    setForceUpdate(1);
  }, []);

  // Network fetch (triggered by forceUpdate > 0)
  useEffect(() => {
    if (forceUpdate === 0) return; // skip initial (handled by cache logic above)

    const controller = new AbortController();
    let retryCount = 0;
    const MAX_RETRIES = 4;
    const RETRY_DELAY = 3000;

    const doFetch = () => {
      const url = `${DEFAULT_CSV_URL}${
        DEFAULT_CSV_URL.includes("?") ? "&" : "?"
      }_=${Date.now()}`;

      fetch(url, { signal: controller.signal, cache: "no-store" })
        .then((r) => {
          if (!r.ok) throw new Error(`HTTP ${r.status}`);
          return r.text();
        })
        .then((text) => {
          const parsed = parseCSV(text);

          // If only 1 year detected (IMPORTRANGE not resolved), retry
          if (parsed.years.length <= 1 && retryCount < MAX_RETRIES) {
            retryCount++;
            console.warn(
              `[Pareto] Only ${parsed.years.length} year(s) detected, ` +
                `retrying in ${RETRY_DELAY / 1000}s (attempt ${retryCount}/${MAX_RETRIES})...`
            );
            setTimeout(doFetch, RETRY_DELAY);
            return;
          }

          // Only save to cache if we got more data than before
          const prevYears = data?.years.length ?? 0;
          if (parsed.years.length >= prevYears && parsed.records.length > 0) {
            saveCache(text);
            console.log(
              `[Pareto] Fresh data saved to cache (${parsed.years.length} years, ` +
                `${parsed.records.length} records)`
            );
          }

          setData(parsed);
          setFetchedAt(new Date());
          setFromCache(false);
          setLoading(false);
        })
        .catch((e) => {
          if ((e as Error).name === "AbortError") return;
          setError((e as Error).message || "Gagal memuat data");
          setLoading(false);
        });
    };

    setLoading(true);
    setError(null);
    setFromCache(false);
    doFetch();

    return () => controller.abort();
  }, [forceUpdate]);

  return { data, loading, error, fetchedAt, fromCache, updateData };
}
