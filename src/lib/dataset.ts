import { useEffect, useState, useCallback, useRef } from "react";
import { parseCSV, type ParsedDataset } from "./csvParser";

export const DEFAULT_CSV_URL =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vTXIuWnOk4-NoraIjEfqp0vDZCnKhqiklrskW_rfJxQatuPtohbwKtcz5TDTwuq7DW3HmzXAa_q2RqI/pub?gid=1311218554&single=true&output=csv";

/**
 * Hardcoded Apps Script Web App URL — primary data source.
 * Server-side getValues() means IMPORTRANGE is always resolved before
 * the JSON response is returned. No CDN cache, no "Loading..." races.
 *
 * Lock this in code (instead of letting users paste their own URL via
 * a settings UI) so that the dashboard always points at the canonical
 * deployment and end users can't accidentally change it.
 */
const HARDCODED_WEB_APP_URL =
  "https://script.google.com/macros/s/AKfycbzxoYH07Y74ybIRBZXI9vHVtc66NEDdeOx64uIr0J0IhNRCZ25RywQiQyQiGVYe2dlp/exec";

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

/* ───── Web App URL ───── */

/** Returns the canonical Web App URL (locked in code). */
export function getWebAppUrl(): string {
  return HARDCODED_WEB_APP_URL;
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

/**
 * Fetch from the Apps Script Web App (returns JSON) and convert
 * the database 2D array back to CSV-like text so the existing parser
 * can consume it. JSON path resolves IMPORTRANGE server-side, so it's
 * always complete (no "Loading...").
 */
async function fetchFromWebApp(
  url: string,
  signal: AbortSignal
): Promise<FetchResult> {
  const res = await fetch(`${url}${url.includes("?") ? "&" : "?"}t=${Date.now()}`, {
    signal,
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Web App HTTP ${res.status}`);
  const json = (await res.json()) as { database?: string[][]; error?: string };
  if (json.error) throw new Error(`Web App error: ${json.error}`);
  if (!json.database) throw new Error("Web App missing 'database' field");

  // Convert 2D array → CSV text (escape any commas/quotes per RFC 4180-ish).
  const csvText = json.database
    .map((row) =>
      row
        .map((cell) => {
          const s = cell == null ? "" : String(cell);
          if (s.includes(",") || s.includes('"') || s.includes("\n")) {
            return '"' + s.replace(/"/g, '""') + '"';
          }
          return s;
        })
        .join(",")
    )
    .join("\n");

  return { text: csvText, parsed: parseCSV(csvText) };
}

/** Plain CSV fetch (Google's published CSV endpoint). */
async function fetchFromCsv(signal: AbortSignal): Promise<FetchResult> {
  const url = `${DEFAULT_CSV_URL}${
    DEFAULT_CSV_URL.includes("?") ? "&" : "?"
  }_=${Date.now()}`;
  const res = await fetch(url, { signal, cache: "no-store" });
  if (!res.ok) throw new Error(`CSV HTTP ${res.status}`);
  const text = await res.text();
  return { text, parsed: parseCSV(text) };
}

/** Single attempt — Web App if configured, else CSV. */
async function fetchOnce(signal: AbortSignal): Promise<FetchResult> {
  const webApp = getWebAppUrl();
  if (webApp) {
    try {
      return await fetchFromWebApp(webApp, signal);
    } catch (e) {
      console.warn("[Pareto] Web App fetch failed, falling back to CSV:", e);
      return await fetchFromCsv(signal);
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
