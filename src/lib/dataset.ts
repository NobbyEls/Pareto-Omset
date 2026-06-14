import { useEffect, useState, useCallback } from "react";
import { parseCSV, type ParsedDataset } from "./csvParser";

export const DEFAULT_CSV_URL =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vTXIuWnOk4-NoraIjEfqp0vDZCnKhqiklrskW_rfJxQatuPtohbwKtcz5TDTwuq7DW3HmzXAa_q2RqI/pub?gid=1311218554&single=true&output=csv";

export interface DatasetState {
  data: ParsedDataset | null;
  loading: boolean;
  error: string | null;
  fetchedAt: Date | null;
  refresh: () => void;
}

/**
 * Loads the CSV, parses it, and re-fetches on demand. Cache-busting
 * query string is appended on each call to bypass Google's CDN caching.
 *
 * Retry logic: Google Sheets sometimes serves a partial response where
 * IMPORTRANGE columns haven't resolved yet (2024 works, 2025/2026 empty).
 * When we detect only 1 year of data, we auto-retry after a short delay
 * (up to 3 times) to give Google time to compute the imported ranges.
 */
export function useDataset(): DatasetState {
  const [data, setData] = useState<ParsedDataset | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fetchedAt, setFetchedAt] = useState<Date | null>(null);
  const [tick, setTick] = useState(0);

  const refresh = useCallback(() => setTick((t) => t + 1), []);

  useEffect(() => {
    const controller = new AbortController();
    let retryCount = 0;
    const MAX_RETRIES = 3;
    const RETRY_DELAY = 3000; // 3 seconds

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

          // If we only got 1 year of data but expect more (IMPORTRANGE not
          // resolved yet), retry after a delay.
          if (parsed.years.length <= 1 && retryCount < MAX_RETRIES) {
            retryCount++;
            console.warn(
              `[Pareto] Only ${parsed.years.length} year(s) detected, ` +
                `retrying in ${RETRY_DELAY / 1000}s (attempt ${retryCount}/${MAX_RETRIES})...`
            );
            setTimeout(doFetch, RETRY_DELAY);
            return;
          }

          setData(parsed);
          setFetchedAt(new Date());
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
    doFetch();

    return () => controller.abort();
  }, [tick]);

  return { data, loading, error, fetchedAt, refresh };
}
