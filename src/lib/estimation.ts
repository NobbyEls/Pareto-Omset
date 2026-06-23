/**
 * Current-month estimation utilities.
 *
 * Formula: estimasi = actual * (daysInMonth / dayOfMonth)
 * Where dayOfMonth = new Date().getDate() and
 * daysInMonth = total days in the current month.
 */

/**
 * Checks if the given year + monthIdx (0-indexed) matches today's year and month.
 */
export function isCurrentMonth(year: number, monthIdx: number): boolean {
  const now = new Date();
  return year === now.getFullYear() && monthIdx === now.getMonth();
}

/**
 * Returns daysInMonth / dayOfMonth for the current date.
 * This is the multiplier to project partial-month data to a full-month estimate.
 */
export function getEstimationMultiplier(): number {
  const now = new Date();
  const dayOfMonth = now.getDate();
  const daysInMonth = new Date(
    now.getFullYear(),
    now.getMonth() + 1,
    0
  ).getDate();
  return daysInMonth / dayOfMonth;
}

/**
 * If the given year+monthIdx is the current month, scales the actual value
 * by the estimation multiplier. Otherwise returns the value unchanged.
 */
export function estimateValue(
  actual: number,
  year: number,
  monthIdx: number
): { value: number; isEstimated: boolean } {
  if (isCurrentMonth(year, monthIdx) && actual > 0) {
    return { value: actual * getEstimationMultiplier(), isEstimated: true };
  }
  return { value: actual, isEstimated: false };
}
