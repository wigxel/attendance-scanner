import { describe, expect, it } from "vitest";
import { formatPhone, isValidPhone, normalizePhone } from "./phone.helpers";

describe("phone helpers", () => {
  it("promotes Nigerian local numbers to E.164", () => {
    expect(normalizePhone("0803 123 4567")).toBe("+2348031234567");
    expect(normalizePhone("8031234567")).toBe("+2348031234567");
  });

  it("formats valid Nigerian numbers for display", () => {
    expect(formatPhone("08031234567")).toBe("+234 803 123 4567");
    expect(formatPhone("+234 803 123 4567")).toBe("+234 803 123 4567");
  });

  it("keeps already-international numbers", () => {
    expect(normalizePhone("+44 20 7946 0958")).toBe("+442079460958");
    expect(isValidPhone("+44 20 7946 0958")).toBe(true);
  });

  it("rejects numbers with no usable shape", () => {
    expect(isValidPhone("12345")).toBe(false);
    expect(isValidPhone("0803")).toBe(false);
    expect(isValidPhone("")).toBe(false);
  });

  it("rejects a Nigerian number with an invalid prefix", () => {
    expect(isValidPhone("01031234567")).toBe(false);
  });
});
