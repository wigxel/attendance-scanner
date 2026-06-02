import { describe, expect, it } from "vitest";
import { formatMetadataParts } from "./audit-metadata";

function fmt(amount: number) {
  const formatter = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "NGN",
    minimumFractionDigits: 2,
  });
  return formatter.format(amount / 100);
}

describe("formatMetadataParts", () => {
  it("returns formatted parts for complete metadata", () => {
    const result = formatMetadataParts({
      amount: 300000,
      seatIds: ["a", "b"],
      duration: 30,
      durationType: "day",
    });

    expect(result).toEqual([fmt(300000), "2 seats", "30 day"]);
  });

  it("returns amount only when that is the only field", () => {
    const result = formatMetadataParts({ amount: 150000 });

    expect(result).toEqual([fmt(150000)]);
  });

  it("returns seat count when only seatIds is present", () => {
    const result = formatMetadataParts({ seatIds: ["a", "b", "c"] });

    expect(result).toEqual(["3 seats"]);
  });

  it("renders singular 'seat' for single seat", () => {
    const result = formatMetadataParts({ seatIds: ["x"] });

    expect(result).toEqual(["1 seat"]);
  });

  it("returns duration with default label when durationType is absent", () => {
    const result = formatMetadataParts({ duration: 14 });

    expect(result).toEqual(["14 days"]);
  });

  it("returns empty array for empty object", () => {
    const result = formatMetadataParts({});

    expect(result).toEqual([]);
  });

  it("returns amount and seats when duration is absent", () => {
    const result = formatMetadataParts({
      amount: 500000,
      seatIds: ["x"],
    });

    expect(result).toEqual([fmt(500000), "1 seat"]);
  });

  it("handles zero amount correctly", () => {
    const result = formatMetadataParts({ amount: 0 });

    expect(result).toEqual([fmt(0)]);
  });
});
