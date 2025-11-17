/**
 * Calculates the number of whole days remaining until the renewal date.
 * Dates are normalised to UTC to avoid daylight-saving issues.
 *
 * @param {Date|string} curDate - Current date or date string.
 * @param {Date|string} renewalDate - Renewal date or date string.
 * @returns {number} Non-negative number of days until renewal.
 */
export function daysToRenewal(curDate, renewalDate) {
  const start = new Date(curDate);
  const renew = new Date(renewalDate);

  const startUtc = Date.UTC(
    start.getFullYear(),
    start.getMonth(),
    start.getDate()
  );
  const endUtc = Date.UTC(
    renew.getFullYear(),
    renew.getMonth(),
    renew.getDate()
  );

  const diffDays = Math.floor((endUtc - startUtc) / 86400000);
  return diffDays > 0 ? diffDays : 0;
}

/**
 * Determines whether the renewal date has already passed.
 *
 * @param {Date|string} curDate - Current date or date string.
 * @param {Date|string} renewalDate - Renewal date or date string.
 * @returns {boolean} True if the renewal date is in the past.
 */
export function isExpired(curDate, renewalDate) {
  return new Date(curDate) > new Date(renewalDate);
}
// Updated: 2025-11-13
