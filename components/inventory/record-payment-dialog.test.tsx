// @vitest-environment node

import { describe, expect, it } from "vitest";
import {
  paymentAmountError,
  paymentDateError,
  paymentKobo,
} from "@/components/forms/RecordPaymentForm";

describe("paymentKobo", () => {
  it("reads naira as whole kobo", () => {
    expect(paymentKobo("1250.50")).toBe(125050);
  });

  it("ignores whatever is not a number", () => {
    expect(paymentKobo("₦1,000")).toBe(100000);
  });
});

describe("paymentAmountError", () => {
  const outstanding = 50000;

  it("accepts a part payment inside the balance", () => {
    expect(paymentAmountError("200", outstanding)).toBeNull();
  });

  it("accepts the exact balance", () => {
    expect(paymentAmountError("500", outstanding)).toBeNull();
  });

  it("refuses more than the balance due", () => {
    expect(paymentAmountError("500.01", outstanding)).toBe(
      "That is more than the balance due.",
    );
  });

  it("refuses nothing at all", () => {
    expect(paymentAmountError("", outstanding)).toBe(
      "Enter an amount more than zero.",
    );
    expect(paymentAmountError("0", outstanding)).toBe(
      "Enter an amount more than zero.",
    );
  });
});

describe("paymentDateError", () => {
  // Midday UTC, so the sale's local day reads the same across timezones.
  const occurredAt = "2026-11-01T12:00:00.000Z";

  it("accepts a date on or after the sale's day, up to today", () => {
    expect(paymentDateError("2026-11-05", occurredAt)).toBeNull();
    expect(
      paymentDateError(new Date().toLocaleDateString("en-CA"), occurredAt),
    ).toBeNull();
  });

  it("refuses a date before the sale was recorded", () => {
    expect(paymentDateError("2026-10-15", occurredAt)).toBe(
      "That date is before the sale was recorded.",
    );
  });

  it("refuses a date in the future", () => {
    expect(paymentDateError("2099-01-01", occurredAt)).toBe(
      "That date is in the future.",
    );
  });
});
