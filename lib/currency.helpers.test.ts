import { describe, expect, it } from "vitest";
import {
  depositKobo,
  isAmountKey,
  parseAmountInput,
  sanitizeAmountInput,
} from "./currency.helpers";

const key = (value: string) => ({
  key: value,
  metaKey: false,
  ctrlKey: false,
  altKey: false,
});

describe("amount helpers", () => {
  it("allows digits, one decimal point and navigation keys", () => {
    expect(isAmountKey(key("7"))).toBe(true);
    expect(isAmountKey(key("."))).toBe(true);
    expect(isAmountKey(key("Backspace"))).toBe(true);
  });

  it("blocks letters and stray symbols", () => {
    expect(isAmountKey(key("e"))).toBe(false);
    expect(isAmountKey(key("₦"))).toBe(false);
  });

  it("keeps shortcuts usable", () => {
    expect(
      isAmountKey({ key: "v", metaKey: true, ctrlKey: false, altKey: false }),
    ).toBe(true);
  });

  it("parses typed amounts and strips junk", () => {
    expect(parseAmountInput("1,250.50")).toBe(1250.5);
    expect(parseAmountInput("12.3.")).toBe(12.3);
    expect(parseAmountInput("")).toBe(0);
    expect(parseAmountInput("abc")).toBe(0);
  });

  it("keeps a trailing decimal while typing", () => {
    expect(sanitizeAmountInput("12.")).toBe("12.");
    expect(sanitizeAmountInput("1,2.3.4")).toBe("12.34");
    expect(sanitizeAmountInput("abc")).toBe("");
  });

  it("caps the till deposit at the sale total", () => {
    expect(depositKobo("250.55", 100_000)).toBe(25_055);
    expect(depositKobo("5000", 100_000)).toBe(100_000);
    expect(depositKobo("", 100_000)).toBe(0);
  });
});
