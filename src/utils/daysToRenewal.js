/**
 * Calculate the number of full days between the current date and a renewal date.
 * If the renewal date is in the past, the result is 0.
 *
 * @param {Date} curDate - The current date.
 * @param {string} renewalDate - The renewal date in ISO 8601 format.
 * @returns {number} Days until renewal or 0 if the date has passed.
 */
export function daysToRenewal(curDate, renewalDate) {
  const diffMs = new Date(renewalDate) - curDate;
  const dayMs = 24 * 60 * 60 * 1000;
  return Math.max(0, Math.floor(diffMs / dayMs));
}
