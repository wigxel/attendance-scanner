import confetti from "canvas-confetti";

export { daysUntilBirthday } from "./birthday-date";

/** Birthday as an "MM-DD" string on the profile (e.g. "02-29"). */
export const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
].map((label, i) => ({ label, value: String(i + 1).padStart(2, "0") }));

/**
 * Maximum days offered per month. February offers 1-29 (so "02-29" is
 * selectable; the day list never offers the 30th or 31st for February).
 */
const MONTH_LENGTHS = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

export const daysInMonth = (month: string) =>
  MONTH_LENGTHS[Number(month) - 1] ?? 0;

export const buildBirthday = (month: string, day: string) => `${month}-${day}`;

/** Device-local date vs the stored "MM-DD" string; "02-29" only matches leap years. */
export const isBirthdayToday = (
  birthday: string | undefined | null,
  date = new Date(),
) => {
  if (!birthday) return false;

  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");

  return `${mm}-${dd}` === birthday;
};

/**
 * Per-trigger, per-day guard so a trigger fires at most once a day. Login and
 * check-in use separate triggers, so both can celebrate on the same day.
 */
export const shouldCelebrate = (trigger: string, date = new Date()) => {
  const store = globalThis.localStorage;
  if (!store) return false;

  const dateKey = date.toISOString().slice(0, 10);
  const key = `birthday-confetti:${trigger}:${dateKey}`;
  const countKey = `${key}:count`;

  const count = Number(store.getItem(countKey) || "0");

  if (count < 3) {
    store.setItem(countKey, String(count + 1));
    return true;
  }

  return false;
};

export const fireBirthdayConfetti = () => {
  confetti({ particleCount: 200, spread: 80, origin: { y: 0.7 } });
};

/** How long a dismissal silences the birthday ask: one month. */
export const BIRTHDAY_ASK_QUIET_MS = 30 * 24 * 60 * 60 * 1000;

/** True while the birthday ask should stay quiet after a dismissal. */
export const isBirthdayAskQuiet = (lastDismissedMs: number, nowMs: number) =>
  nowMs - lastDismissedMs < BIRTHDAY_ASK_QUIET_MS;
