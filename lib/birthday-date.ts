import { differenceInCalendarDays } from "date-fns";

/**
 * Days from `date` to the birthday's next occurrence (0 = today), or null
 * for a missing or malformed birthday. "02-29" falls back to 03-01 in
 * non-leap years — shown a day late, never skipped.
 *
 * Pure date math, kept apart from lib/birthday.ts so Convex never bundles
 * the browser-only confetti dependency.
 */
export const daysUntilBirthday = (
  birthday: string | undefined | null,
  date = new Date(),
): number | null => {
  if (!birthday) return null;

  const [mm, dd] = birthday.split("-").map(Number);
  if (!mm || !dd || mm < 1 || mm > 12 || dd < 1 || dd > 31) return null;

  const today = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const year = today.getFullYear();
  // new Date() rolls a Feb 29 in a non-leap year over to Mar 1 automatically.
  let next = new Date(year, mm - 1, dd);
  if (next < today) next = new Date(year + 1, mm - 1, dd);

  return differenceInCalendarDays(next, today);
};
