// @vitest-environment jsdom
import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { SalePaymentRow } from "@/convex/inventory";
import { PaymentHistorySection } from "./payment-history-section";

afterEach(() => {
  cleanup();
});

/** Only the fields PaymentLedger touches; the rest is opaque. */
function paymentRow(id: string): SalePaymentRow {
  return {
    _id: id,
    _creationTime: 0,
    saleId: "sale-1",
    amountKobo: 50_000,
    paidAt: "2026-11-23T10:00:00Z",
    channel: "cash",
    kind: "payment",
    reversesId: null,
    createdBy: "profile-1",
    recordedByName: "Teller",
  } as unknown as SalePaymentRow;
}

const baseProps = {
  payments: [paymentRow("p1")],
  canManage: true,
  onReverse: vi.fn(),
};

describe("PaymentHistorySection", () => {
  it("renders the heading, ledger row, and explicit trigger", () => {
    const { getByText } = render(
      <PaymentHistorySection {...baseProps} onRecordPayment={() => {}} />,
    );

    expect(getByText("Payments")).not.toBeNull();
    expect(getByText("Record payment")).not.toBeNull();
    expect(getByText("Teller")).not.toBeNull();
  });

  it("omits the trigger when the sheet passes none", () => {
    const { getByText, queryByText } = render(
      <PaymentHistorySection {...baseProps} />,
    );

    expect(getByText("Payments")).not.toBeNull();
    expect(queryByText("Record payment")).toBeNull();
  });
});
