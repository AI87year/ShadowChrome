/**
 * Calculates the number of whole days remaining until the renewal date.
 * Dates are normalised to UTC to avoid daylight‑saving issues.
 *
 * @param {Date} curDate - The current date.
 * @param {string} renewalDate - Renewal date in ISO 8601 format.
 * @returns {number} Days until renewal or 0 if the date has passed.
 */
export function daysToRenewal(curDate, renewalDate) {
  const renew = new Date(renewalDate);

  const startUtc = Date.UTC(
    curDate.getFullYear(),
    curDate.getMonth(),
    curDate.getDate()
  );
  const endUtc = Date.UTC(renew.getFullYear(), renew.getMonth(), renew.getDate());

  const diffDays = Math.floor((endUtc - startUtc) / 86400000);
  return diffDays > 0 ? diffDays : 0;
}
