import { describe, expect, it } from "vitest";
import { getReservablePlans, resolvePlanKey } from "./booking-plans";

const plans = [
  { key: "daily", features: [] as string[] },
  { key: "weekly", features: ["priority-check-in"] },
  { key: "monthly", features: ["booking"] },
  { key: "legacy" },
];

describe("getReservablePlans", () => {
  it("treats plans with no features as reservable", () => {
    expect(getReservablePlans([{ key: "daily", features: [] }])).toHaveLength(
      1,
    );
  });

  it("treats plans with missing features as reservable", () => {
    expect(getReservablePlans([{ key: "legacy" }])).toHaveLength(1);
  });

  it("keeps plans that declare the booking feature", () => {
    expect(
      getReservablePlans([{ key: "monthly", features: ["booking"] }]),
    ).toEqual([{ key: "monthly", features: ["booking"] }]);
  });

  it("drops plans that opt out via a non-empty feature list", () => {
    const reservable = getReservablePlans(plans);

    expect(reservable.map((plan) => plan.key)).toEqual([
      "daily",
      "monthly",
      "legacy",
    ]);
  });
});

describe("resolvePlanKey", () => {
  it("returns the stored key when it still exists", () => {
    expect(resolvePlanKey("weekly", plans)).toBe("weekly");
  });

  it("falls back to the first plan when the stored key is stale", () => {
    expect(resolvePlanKey("removed-plan", plans)).toBe("daily");
  });

  it("falls back to the first plan when nothing is stored", () => {
    expect(resolvePlanKey(null, plans)).toBe("daily");
  });

  it("returns null when there are no plans", () => {
    expect(resolvePlanKey("daily", [])).toBeNull();
  });
});
