import { useEffect, useState, useCallback, useRef } from "react";
import { parseCSV, type ParsedDataset } from "./csvParser";

/**
 * Apps Script Web App URL — reads directly from Spreadsheet (always fresh).
 * Fallback: Published CSV (has Google cache delay).
 * 
 * Deploy Apps Script dari folder /apps-script dan paste URL deployment di sini.
 * Set ke "" untuk disable (hanya pakai Published CSV).
 */
export const SCRIPT_URL = "";

export const DEFAULT_CSV_URL =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vTXIuWnOk4-NoraIjEfqp0vDZCnKhqiklrskW_rfJxQatuPtohbwKtcz5TDTwuq7DW3HmzXAa_q2RqI/pub?gid=1311218554&single=true&output=csv";

const CACHE_KEY = "pareto-omset-cache";
const CACHE_TS_KEY = "pareto-omset-cache-ts";

/** "Update Data" retries this many times with this delay before giving up. */
const MAX_RETRIES = 6;
const RETRY_DELAY = 4000;

/** Data is "complete enough" if it has at least this many years. */
const MIN_VALID_YEARS = 2;

export interface DatasetState {
  data: ParsedDataset | null;
  /** True only on the very first load when no cache exists. */
  loading: boolean;
  /** True while a background or manual revalidation is in flight. */
  refreshing: boolean;
  error: string | null;
  fetchedAt: Date | null;
  fromCache: boolean;
  /** Cache is older than STALE_AFTER_HOURS — UI may want to surface this. */
  isStale: boolean;
  updateData: () => void;
}

/* ───── Cache helpers ───── */

function saveCache(text: string): void {
  try {
    localStorage.setItem(CACHE_KEY, text);
    localStorage.setItem(CACHE_TS_KEY, new Date().toISOString());
  } catch {
    /* quota exceeded — ignore */
  }
}

/* ───── Fetch logic ───── */

interface FetchResult {
  text: string;
  parsed: ParsedDataset;
}

/** Fetch directly from the published Google Sheets CSV endpoint. */
async function fetchFromCsv(signal: AbortSignal): Promise<FetchResult> {
  const url = `${DEFAULT_CSV_URL}${
    DEFAULT_CSV_URL.includes("?") ? "&" : "?"
  }_=${Date.now()}`;
  const res = await fetch(url, { signal, cache: "no-store" });
  if (!res.ok) throw new Error(`CSV HTTP ${res.status}`);
  const text = await res.text();
  return { text, parsed: parseCSV(text) };
}

/** Fetch from Apps Script Web App (always real-time). */
async function fetchFromScript(signal: AbortSignal): Promise<FetchResult> {
  if (!SCRIPT_URL) throw new Error("SCRIPT_URL not configured");
  const url = `${SCRIPT_URL}?type=omset&_=${Date.now()}`;
  const res = await fetch(url, { signal, cache: "no-store", redirect: "follow" });
  if (!res.ok) throw new Error(`Script HTTP ${res.status}`);
  const text = await res.text();
  // Check if response is a JSON error
  if (text.startsWith("{")) {
    const json = JSON.parse(text);
    if (json.error) throw new Error(json.error);
  }
  return { text, parsed: parseCSV(text) };
}

/** Single attempt — try Apps Script first, fallback to Published CSV. */
async function fetchOnce(signal: AbortSignal): Promise<FetchResult> {
  if (SCRIPT_URL) {
    try {
      return await fetchFromScript(signal);
    } catch (e) {
      if ((e as Error).name === "AbortError") throw e;
      console.warn("[Pareto] Apps Script failed, falling back to CSV:", (e as Error).message);
    }
  }
  return await fetchFromCsv(signal);
}

/**
 * Aggressive fetch: retry up to MAX_RETRIES until we get data with at least
 * MIN_VALID_YEARS years. Returns the BEST attempt seen (most years) when
 * exhausted.
 */
async function aggressiveFetch(
  signal: AbortSignal,
  onAttempt?: (n: number, max: number) => void
): Promise<FetchResult> {
  let best: FetchResult | null = null;
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    onAttempt?.(attempt, MAX_RETRIES);
    try {
      const result = await fetchOnce(signal);
      if (result.parsed.years.length >= MIN_VALID_YEARS) {
        return result; // good enough
      }
      // Track the best (most years) result so far.
      if (
        !best ||
        result.parsed.years.length > best.parsed.years.length ||
        result.parsed.records.length > best.parsed.records.length
      ) {
        best = result;
      }
      console.warn(
        `[Pareto] Attempt ${attempt}/${MAX_RETRIES}: only ${result.parsed.years.length} year(s), retrying...`
      );
    } catch (e) {
      if ((e as Error).name === "AbortError") throw e;
      lastError = e as Error;
      console.warn(`[Pareto] Attempt ${attempt}/${MAX_RETRIES} failed:`, e);
    }
    if (attempt < MAX_RETRIES) {
      await new Promise((r) => setTimeout(r, RETRY_DELAY));
      if (signal.aborted) throw new DOMException("Aborted", "AbortError");
    }
  }

  if (best) return best;
  throw lastError ?? new Error("Gagal memuat data setelah beberapa percobaan");
}

/* ───── The hook ───── */

export function useDataset(): DatasetState {
  const [data, setData] = useState<ParsedDataset | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fetchedAt, setFetchedAt] = useState<Date | null>(null);
  const [fromCache, setFromCache] = useState(false);
  const [isStale, setIsStale] = useState(false);
  const dataRef = useRef<ParsedDataset | null>(null);
  dataRef.current = data;

  const runFetch = useCallback((isInitial: boolean) => {
    const controller = new AbortController();
    if (isInitial) setLoading(true);
    setRefreshing(true);
    setError(null);

    aggressiveFetch(controller.signal)
      .then(({ text, parsed }) => {
        // Only persist & swap if this is "better" than what we already have.
        const currentYears = dataRef.current?.years.length ?? 0;
        const isBetter =
          parsed.years.length > currentYears ||
          (parsed.years.length === currentYears && parsed.records.length > 0);

        if (isBetter && parsed.records.length > 0) {
          if (parsed.years.length >= MIN_VALID_YEARS) {
            saveCache(text);
            console.log(
              `[Pareto] Cache updated: ${parsed.years.length} years, ${parsed.records.length} records`
            );
          }
          setData(parsed);
          setFetchedAt(new Date());
          setFromCache(false);
          setIsStale(false);
        } else if (!dataRef.current) {
          // No cache and we got something — show whatever we got even if incomplete.
          setData(parsed);
          setFetchedAt(new Date());
          setFromCache(false);
        }
      })
      .catch((e) => {
        if ((e as Error).name === "AbortError") return;
        // Only surface error if we have nothing to show.
        if (!dataRef.current) {
          setError((e as Error).message || "Gagal memuat data");
        } else {
          console.warn("[Pareto] Background refresh failed:", e);
        }
      })
      .finally(() => {
        setLoading(false);
        setRefreshing(false);
      });

    return () => controller.abort();
  }, []);

  // On mount: always fetch fresh data from network.
  // Cache is still saved on successful fetch (for potential future offline use)
  // but NOT served on initial load — data is always live.
  useEffect(() => {
    return runFetch(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const updateData = useCallback(() => {
    runFetch(false);
  }, [runFetch]);

  return {
    data,
    loading,
    refreshing,
    error,
    fetchedAt,
    fromCache,
    isStale,
    updateData,
  };
}
