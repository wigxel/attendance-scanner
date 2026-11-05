import { describe, expect, it } from "vitest";
import { isReservable, resolvePlanKey } from "./plan-features";

describe("isReservable", () => {
  it("is false for an empty feature list", () => {
    expect(isReservable([])).toBe(false);
  });

  it("is false when only an unrelated feature is attached", () => {
    expect(isReservable(["priority-check-in"])).toBe(false);
  });

  it("is true when booking is attached", () => {
    expect(isReservable(["priority-check-in", "booking"])).toBe(true);
  });
});

describe("resolvePlanKey", () => {
  const plans = [{ key: "daily" }, { key: "weekly" }];

  it("keeps a stored key that is still reservable", () => {
    expect(resolvePlanKey("weekly", plans)).toBe("weekly");
  });

  it("falls back to the first plan for a stale key", () => {
    expect(resolvePlanKey("monthly", plans)).toBe("daily");
  });

  it("falls back to the first plan when nothing is stored", () => {
    expect(resolvePlanKey(null, plans)).toBe("daily");
  });

  it("returns null when there is nothing to select", () => {
    expect(resolvePlanKey("daily", [])).toBeNull();
  });
});
