import { useEffect, useState, useCallback } from "react";
import { parseBrandCSV, type BrandDataset } from "./brandParser";
import { SCRIPT_URL } from "./dataset";

export const BRAND_CSV_URL =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vTXIuWnOk4-NoraIjEfqp0vDZCnKhqiklrskW_rfJxQatuPtohbwKtcz5TDTwuq7DW3HmzXAa_q2RqI/pub?gid=1623559016&single=true&output=csv";

export interface BrandDatasetState {
  data: BrandDataset | null;
  loading: boolean;
  error: string | null;
  fetchedAt: Date | null;
  refresh: () => void;
}

/**
 * Loads the brand analysis CSV, parses it, and re-fetches on demand.
 */
export function useBrandDataset(): BrandDatasetState {
  const [data, setData] = useState<BrandDataset | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fetchedAt, setFetchedAt] = useState<Date | null>(null);
  const [tick, setTick] = useState(0);

  const refresh = useCallback(() => setTick((t) => t + 1), []);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(null);

    const url = SCRIPT_URL
      ? `${SCRIPT_URL}?type=brand&_=${Date.now()}`
      : `${BRAND_CSV_URL}&_=${Date.now()}`;

    fetch(url, { signal: controller.signal, cache: "no-store", redirect: "follow" })
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.text();
      })
      .then((text) => {
        // If Apps Script returned JSON error, fallback to CSV
        if (text.startsWith("{")) {
          const json = JSON.parse(text);
          if (json.error) throw new Error(json.error);
        }
        const parsed = parseBrandCSV(text);
        setData(parsed);
        setFetchedAt(new Date());
      })
      .catch((e) => {
        if ((e as Error).name === "AbortError") return;
        // If Apps Script failed and we haven't tried CSV yet, try CSV
        if (SCRIPT_URL) {
          const csvUrl = `${BRAND_CSV_URL}&_=${Date.now()}`;
          fetch(csvUrl, { signal: controller.signal, cache: "no-store" })
            .then((r) => r.text())
            .then((text) => {
              const parsed = parseBrandCSV(text);
              setData(parsed);
              setFetchedAt(new Date());
            })
            .catch(() => setError((e as Error).message || "Gagal memuat data brand"));
        } else {
          setError((e as Error).message || "Gagal memuat data brand");
        }
      })
      .finally(() => setLoading(false));

    return () => controller.abort();
  }, [tick]);

  return { data, loading, error, fetchedAt, refresh };
}
