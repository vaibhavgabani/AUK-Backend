/**
 * Computes event status dynamically based on start/end datetimes and current time.
 * Rules:
 * now < startDatetime -> "upcoming"
 * startDatetime <= now <= endDatetime -> "ongoing"
 * now > endDatetime -> "completed"
 *
 * @param {Date|string} startDatetime
 * @param {Date|string} endDatetime
 * @param {Date} [now=new Date()]
 * @returns {"upcoming"|"ongoing"|"completed"}
 */
export function getEventStatus(startDatetime, endDatetime, now = new Date()) {
  const start = new Date(startDatetime);
  const end = new Date(endDatetime);

  if (now < start) {
    return 'upcoming';
  } else if (now >= start && now <= end) {
    return 'ongoing';
  } else {
    return 'completed';
  }
}
