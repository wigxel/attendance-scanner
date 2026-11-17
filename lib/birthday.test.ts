import { beforeEach, describe, expect, it } from "vitest";
import {
  buildBirthday,
  daysInMonth,
  isBirthdayAskQuiet,
  isBirthdayToday,
  shouldCelebrate,
} from "./birthday";

describe("daysInMonth", () => {
  it("caps February at 29 (never 30)", () => {
    expect(daysInMonth("02")).toBe(29);
  });

  it("returns 31 for January", () => {
    expect(daysInMonth("01")).toBe(31);
  });

  it("returns 30 for April", () => {
    expect(daysInMonth("04")).toBe(30);
  });

  it("returns 0 for an unknown month", () => {
    expect(daysInMonth("13")).toBe(0);
  });
});

describe("isBirthdayToday", () => {
  it("matches on the birthday", () => {
    expect(isBirthdayToday("11-16", new Date(2026, 10, 16))).toBe(true);
  });

  it("does not match on other days", () => {
    expect(isBirthdayToday("11-16", new Date(2026, 10, 15))).toBe(false);
  });

  it("does not match a 02-29 birthday on a non-leap year", () => {
    expect(isBirthdayToday("02-29", new Date(2027, 1, 28))).toBe(false);
  });

  it("matches a 02-29 birthday on a leap year", () => {
    expect(isBirthdayToday("02-29", new Date(2028, 1, 29))).toBe(true);
  });

  it("returns false without a birthday", () => {
    expect(isBirthdayToday(undefined)).toBe(false);
    expect(isBirthdayToday(null)).toBe(false);
  });
});

describe("buildBirthday", () => {
  it("joins month and day", () => {
    expect(buildBirthday("02", "29")).toBe("02-29");
  });
});

describe("isBirthdayAskQuiet", () => {
  const month = 30 * 24 * 60 * 60 * 1000;
  const now = Date.UTC(2026, 10, 17, 12, 0, 0);

  it("is quiet right after a dismissal", () => {
    expect(isBirthdayAskQuiet(now - 1000, now)).toBe(true);
  });

  it("is quiet up to one month minus a millisecond", () => {
    expect(isBirthdayAskQuiet(now - (month - 1), now)).toBe(true);
  });

  it("asks again exactly one month after the dismissal", () => {
    expect(isBirthdayAskQuiet(now - month, now)).toBe(false);
  });

  it("asks again long after the dismissal", () => {
    expect(isBirthdayAskQuiet(now - (month + 1), now)).toBe(false);
  });

  it("treats a never-dismissed member as due", () => {
    expect(isBirthdayAskQuiet(0, now)).toBe(false);
  });
});

describe("shouldCelebrate", () => {
  beforeEach(() => {
    // Edge-runtime has no localStorage; stub the surface we use.
    const backing = new Map<string, string>();
    globalThis.localStorage = {
      getItem: (k: string) => backing.get(k) ?? null,
      setItem: (k: string, v: string) => backing.set(k, v),
    } as unknown as Storage;
  });

  it("fires up to three times per day per trigger", () => {
    expect(shouldCelebrate("login", new Date(2026, 10, 16))).toBe(true);
    expect(shouldCelebrate("login", new Date(2026, 10, 16))).toBe(true);
    expect(shouldCelebrate("login", new Date(2026, 10, 16))).toBe(true);
    expect(shouldCelebrate("login", new Date(2026, 10, 16))).toBe(false);
  });

  it("separate triggers can both celebrate on the same day", () => {
    expect(shouldCelebrate("login", new Date(2026, 10, 16))).toBe(true);
    expect(shouldCelebrate("checkin", new Date(2026, 10, 16))).toBe(true);
  });

  it("fires again the next day", () => {
    expect(shouldCelebrate("login", new Date(2026, 10, 16))).toBe(true);
    expect(shouldCelebrate("login", new Date(2026, 10, 17))).toBe(true);
  });
});
