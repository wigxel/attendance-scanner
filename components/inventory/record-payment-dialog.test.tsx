// @vitest-environment node

import { describe, expect, it, vi } from "vitest";
import { paymentAmountError, paymentKobo } from "./record-payment-dialog";

vi.mock("convex/react", () => ({
  useMutation: vi.fn(),
}));

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
