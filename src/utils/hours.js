/**
 * Calculates decimal duration in hours between startDatetime and endDatetime.
 * Example: 13:30 to 18:00 = 4.5 hours.
 *
 * @param {Date|string} startDatetime
 * @param {Date|string} endDatetime
 * @returns {number} Hours formatted to 2 decimal places
 */
export function calculateHours(startDatetime, endDatetime) {
  const start = new Date(startDatetime);
  const end = new Date(endDatetime);
  const diffMs = end.getTime() - start.getTime();
  if (diffMs <= 0) return 0;
  const hours = diffMs / (1000 * 60 * 60);
  return Math.round(hours * 100) / 100;
}
