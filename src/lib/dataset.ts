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
    setLoading(true);
    setError(null);

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
        setData(parsed);
        setFetchedAt(new Date());
      })
      .catch((e) => {
        if ((e as Error).name === "AbortError") return;
        setError((e as Error).message || "Gagal memuat data");
      })
      .finally(() => setLoading(false));

    return () => controller.abort();
  }, [tick]);

  return { data, loading, error, fetchedAt, refresh };
}
