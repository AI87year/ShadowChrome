// Derived from AdGuardVPNExtension's src/common/utils/date.ts
// Licensed under the GNU General Public License v3.0.

/**
 * Returns the number of days between the current date and the renewal date.
 * If the renewal date is in the past, it returns 0.
 * @param {Date} curDate - The current date.
 * @param {string} renewalDate - The renewal date in ISO 8601 format.
 * @returns {number} Days until renewal or 0 if past.
 */
export function daysToRenewal(curDate, renewalDate) {
  const parsed = new Date(renewalDate);
  const diff = parsed.getTime() - curDate.getTime();
  const dayMs = 24 * 60 * 60 * 1000;
  const days = Math.floor(diff / dayMs);
  return days >= 0 ? days : 0;
}
