import { addDays, addMinutes, addSeconds, formatDistance } from "date-fns";
import { describe, expect, it } from "vitest";
import { calculateEndDate, formatCompact } from "./utils";

function toDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

describe("calculateEndDate", () => {
  it("returns start date when workingDays is 1 and start is not Sunday", () => {
    // Monday 2026-08-24
    const start = new Date(2026, 7, 24);
    const result = calculateEndDate(start, 1);
    expect(toDateStr(result)).toBe("2026-08-24");
  });

  it("skips Sunday when start is Saturday with workingDays > 1", () => {
    // Saturday 2026-08-22, workingDays=2 → Mon 2026-08-24
    const start = new Date(2026, 7, 22);
    const result = calculateEndDate(start, 2);
    expect(toDateStr(result)).toBe("2026-08-24");
  });

  it("skips Sunday when it falls in the middle of the range", () => {
    // Monday 2026-08-24, workingDays=5 → Fri 2026-08-28
    const start = new Date(2026, 7, 24);
    const result = calculateEndDate(start, 5);
    expect(toDateStr(result)).toBe("2026-08-28");
  });

  it("skips multiple Sundays for long ranges", () => {
    // Monday 2026-08-24, workingDays=15 → Wed 2026-09-09
    const start = new Date(2026, 7, 24);
    const result = calculateEndDate(start, 15);
    expect(toDateStr(result)).toBe("2026-09-09");
  });

  it("counts start date as day 1 when not Sunday", () => {
    // Tuesday 2026-08-25, workingDays=3 → Thu 2026-08-27
    const start = new Date(2026, 7, 25);
    const result = calculateEndDate(start, 3);
    expect(toDateStr(result)).toBe("2026-08-27");
  });

  it("does not count start date when it is Sunday", () => {
    // Sunday 2026-08-23, workingDays=1 → Monday 2026-08-24
    const start = new Date(2026, 7, 23);
    const result = calculateEndDate(start, 1);
    expect(toDateStr(result)).toBe("2026-08-24");
  });

  it("handles workingDays of 1 starting on Sunday", () => {
    // Sunday 2026-08-23 → Monday 2026-08-24
    const start = new Date(2026, 7, 23);
    const result = calculateEndDate(start, 1);
    expect(toDateStr(result)).toBe("2026-08-24");
  });

  it("handles 31 working days (calendar_month) via addMonths shortcut", () => {
    // workingDays > 24 triggers addMonths(startDate, 1)
    // Monday 2026-08-24 + 1 month → Tuesday 2026-09-24
    const start = new Date(2026, 7, 24);
    const result = calculateEndDate(start, 31);
    expect(toDateStr(result)).toBe("2026-09-24");
  });

  it("handles 25 working days via addMonths shortcut", () => {
    // workingDays > 24 triggers addMonths(startDate, 1)
    // Monday 2026-08-24 + 1 month → Tuesday 2026-09-24
    const start = new Date(2026, 7, 24);
    const result = calculateEndDate(start, 25);
    expect(toDateStr(result)).toBe("2026-09-24");
  });

  it("counts working days when exactly 24", () => {
    // workingDays <= 24 uses the Sunday-skipping loop
    // Monday 2026-08-24, workingDays=24 → Sat 2026-09-19
    const start = new Date(2026, 7, 24);
    const result = calculateEndDate(start, 24);
    expect(toDateStr(result)).toBe("2026-09-19");
  });

  it("does not mutate the input date", () => {
    const start = new Date(2026, 7, 24);
    const original = toDateStr(start);
    calculateEndDate(start, 5);
    expect(toDateStr(start)).toBe(original);
  });
});

// ─── formatDistance (date-fns) ───────────────────────────────────────

describe("formatDistance between two dates", () => {
  it("returns '6 days' for a 6-day gap", () => {
    const start = new Date(2026, 7, 24);
    const end = addDays(start, 6);
    expect(formatDistance(start, end)).toBe("6 days");
  });

  it("returns '1 day' for a 1-day gap", () => {
    const start = new Date(2026, 7, 24);
    const end = addDays(start, 1);
    expect(formatDistance(start, end)).toBe("1 day");
  });

  it("returns 'about 1 hour' for a 60-minute gap", () => {
    const start = new Date(2026, 7, 24, 12, 0, 0);
    const end = addMinutes(start, 60);
    expect(formatDistance(start, end)).toBe("about 1 hour");
  });

  it("returns '30 minutes' for a 30-minute gap", () => {
    const start = new Date(2026, 7, 24, 12, 0, 0);
    const end = addMinutes(start, 30);
    expect(formatDistance(start, end)).toBe("30 minutes");
  });

  it("returns 'less than a minute' for a 20-second gap", () => {
    const start = new Date(2026, 7, 24, 12, 0, 0);
    const end = addSeconds(start, 20);
    expect(formatDistance(start, end)).toBe("less than a minute");
  });

  it("returns 'about 1 month' for a 31-day gap", () => {
    const start = new Date(2026, 7, 24);
    const end = addDays(start, 31);
    expect(formatDistance(start, end)).toBe("about 1 month");
  });

  it("returns '2 months' for a 62-day gap", () => {
    const start = new Date(2026, 7, 24);
    const end = addDays(start, 62);
    expect(formatDistance(start, end)).toBe("2 months");
  });
});

// ─── formatCompact ─────────────────────────────────────────────────

describe("formatCompact", () => {
  it("returns '6d' for a 6-day gap", () => {
    const start = new Date(2026, 7, 24);
    const end = addDays(start, 6);
    expect(formatCompact(start, end)).toBe("6d");
  });

  it("returns '1mo 6d' for 37 days", () => {
    const start = new Date(2026, 7, 24);
    const end = new Date(2026, 8, 30);
    expect(formatCompact(start, end)).toBe("1mo 6d");
  });

  it("returns '3h 45m' for 3 hours 45 minutes", () => {
    const start = new Date(2026, 7, 24, 12, 0, 0);
    const end = new Date(2026, 7, 24, 15, 45, 0);
    expect(formatCompact(start, end)).toBe("3h 45m");
  });

  it("returns '45m 10s' for 45 minutes 10 seconds", () => {
    const start = new Date(2026, 7, 24, 12, 0, 0);
    const end = new Date(2026, 7, 24, 12, 45, 10);
    expect(formatCompact(start, end)).toBe("45m 10s");
  });

  it("returns '0s' when start equals end", () => {
    const d = new Date(2026, 7, 24);
    expect(formatCompact(d, d)).toBe("0s");
  });

  it("returns '1y 2mo' for 14 months", () => {
    const start = new Date(2025, 6, 1);
    const end = new Date(2026, 8, 1);
    expect(formatCompact(start, end)).toBe("1y 2mo");
  });

  it("returns '2d 5h 30m' for mixed units", () => {
    const start = new Date(2026, 7, 24, 8, 0, 0);
    const end = new Date(2026, 7, 26, 13, 30, 0);
    expect(formatCompact(start, end)).toBe("2d 5h 30m");
  });
});
