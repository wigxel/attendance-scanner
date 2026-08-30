import { describe, expect, it } from "vitest";
import { DurationGroupImpl } from "./date-range";

describe("DurationGroupImpl.resolveFromDays", () => {
  it("should return 'day' for 1 day", () => {
    expect(DurationGroupImpl.resolveFromDays(1)).toBe("day");
  });

  it("should return 'day' for 5 days (upper boundary)", () => {
    expect(DurationGroupImpl.resolveFromDays(5)).toBe("day");
  });

  it("should return 'week' for 6 days (lower boundary)", () => {
    expect(DurationGroupImpl.resolveFromDays(6)).toBe("week");
  });

  it("should return 'week' for 23 days (upper boundary)", () => {
    expect(DurationGroupImpl.resolveFromDays(23)).toBe("week");
  });

  it("should return 'month' for 24 days (lower boundary)", () => {
    expect(DurationGroupImpl.resolveFromDays(24)).toBe("month");
  });

  it("should return 'month' for 30 days", () => {
    expect(DurationGroupImpl.resolveFromDays(30)).toBe("month");
  });

  it("should throw for 0 days", () => {
    expect(() => DurationGroupImpl.resolveFromDays(0)).toThrow();
  });

  it("should throw for negative days", () => {
    expect(() => DurationGroupImpl.resolveFromDays(-1)).toThrow();
  });
});
