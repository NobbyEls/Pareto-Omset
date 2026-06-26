/**
 * Current-month estimation utilities.
 *
 * Formula: estimasi = actual * (daysInMonth / dayOfMonth)
 * Where dayOfMonth comes from the "last data date" stored in the Jasa CSV
 * header (cell E1, format DD/MM/YYYY). Falls back to new Date() if not set.
 *
 * The data date is set by calling setDataDate() from the Jasa data pipeline
 * after parsing the CSV header row.
 */

/** Module-level reference date (set from Jasa CSV E1, fallback: new Date()) */
let _dataDate: Date | null = null;

/**
 * Set the reference date used for estimation calculations.
 * Called by the Jasa data pipeline after extracting the date from E1.
 * Format expected: DD/MM/YYYY string or a pre-parsed Date object.
 */
export function setDataDate(date: Date | null): void {
  _dataDate = date;
}

/**
 * Parse a DD/MM/YYYY string into a Date object.
 * Returns null if the string is empty or unparseable.
 */
export function parseDateDDMMYYYY(str: string): Date | null {
  if (!str || !str.trim()) return null;
  const parts = str.trim().split("/");
  if (parts.length !== 3) return null;
  const day = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10); // 1-based
  const year = parseInt(parts[2], 10);
  if (isNaN(day) || isNaN(month) || isNaN(year)) return null;
  if (day < 1 || day > 31 || month < 1 || month > 12 || year < 2000) return null;
  return new Date(year, month - 1, day);
}

/** Get the effective reference date. Returns null if not yet set. */
function getReferenceDate(): Date | null {
  return _dataDate;
}

/** True once a reference date has been set (from the Jasa CSV E1 header). */
export function hasDataDate(): boolean {
  return _dataDate !== null;
}

/**
 * Checks if the given year + monthIdx (0-indexed) matches the reference date's
 * year and month. Returns false if reference date is not yet set.
 */
export function isCurrentMonth(year: number, monthIdx: number): boolean {
  const ref = getReferenceDate();
  if (!ref) return false; // Not yet loaded — don't estimate
  return year === ref.getFullYear() && monthIdx === ref.getMonth();
}

/**
 * Returns daysInMonth / dayOfMonth for the reference date.
 * Returns 1 (no scaling) if reference date is not yet set.
 */
export function getEstimationMultiplier(): number {
  const ref = getReferenceDate();
  if (!ref) return 1; // Not yet loaded — no scaling
  const dayOfMonth = ref.getDate();
  const daysInMonth = new Date(
    ref.getFullYear(),
    ref.getMonth() + 1,
    0
  ).getDate();
  return daysInMonth / dayOfMonth;
}

/**
 * If the given year+monthIdx is the current month (per reference date), scales
 * the actual value by the estimation multiplier. Otherwise returns the value
 * unchanged.
 *
 * IMPORTANT: If reference date is not yet set (_dataDate is null), this
 * function returns the actual value UNCHANGED (no estimation applied).
 * This prevents wrong calculations when main data loads before Jasa CSV.
 *
 * Guard: if dayOfMonth < 3 the multiplier would be 30x or 15x which produces
 * absurd projections, so we return the actual value unchanged in that case.
 */
export function estimateValue(
  actual: number,
  year: number,
  monthIdx: number
): { value: number; isEstimated: boolean } {
  const ref = getReferenceDate();
  if (!ref) return { value: actual, isEstimated: false }; // Not ready yet
  if (isCurrentMonth(year, monthIdx) && actual > 0) {
    const dayOfMonth = ref.getDate();
    if (dayOfMonth < 3) {
      return { value: actual, isEstimated: false };
    }
    return { value: actual * getEstimationMultiplier(), isEstimated: true };
  }
  return { value: actual, isEstimated: false };
}
