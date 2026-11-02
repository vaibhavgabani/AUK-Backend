/**
 * Calculates decimal duration in hours between startDatetime and endDatetime.
 * Defensively ensures soft-deleted events or invalid/missing ranges return 0 hours.
 * Example: 13:30 to 18:00 = 4.5 hours.
 *
 * @param {Date|string} startDatetime
 * @param {Date|string} endDatetime
 * @param {object} [options]
 * @param {Date|string|null} [options.eventDeletedAt] - If provided and not null, returns 0 hours.
 * @param {boolean} [options.isDeleted] - If true, returns 0 hours.
 * @returns {number} Hours formatted to 2 decimal places
 */
export function calculateHours(startDatetime, endDatetime, options = {}) {
  if (options && (options.eventDeletedAt != null || options.isDeleted === true)) {
    return 0;
  }
  if (!startDatetime || !endDatetime) {
    return 0;
  }
  const start = new Date(startDatetime);
  const end = new Date(endDatetime);
  const diffMs = end.getTime() - start.getTime();
  if (diffMs <= 0 || isNaN(diffMs)) return 0;
  const hours = diffMs / (1000 * 60 * 60);
  return Math.round(hours * 100) / 100;
}
