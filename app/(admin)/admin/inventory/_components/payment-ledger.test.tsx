// @vitest-environment jsdom

import { cleanup } from "@testing-library/react";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it } from "vitest";
import type { SalePaymentRow } from "@/convex/inventory";
import { PaymentLedger } from "./payment-ledger";

afterEach(() => {
  cleanup();
  document.body.innerHTML = "";
});

type ExtraPaymentFields = {
  reversesId?: string;
  channel?: "cash" | "pos" | "transfer";
};

const row = (
  id: string,
  paidAt: string,
  kind: SalePaymentRow["kind"],
  extra?: ExtraPaymentFields,
): SalePaymentRow =>
  ({
    _id: id,
    _creationTime: 0,
    saleId: "s1",
    amountKobo: 1000,
    paidAt,
    kind,
    recordedByName: "Ada",
    ...extra,
  }) as unknown as SalePaymentRow;

function renderLedger(
  payments: SalePaymentRow[],
  canManage = true,
): HTMLElement {
  const container = document.createElement("div");
  document.body.append(container);
  act(() => {
    createRoot(container).render(
      <PaymentLedger
        payments={payments}
        canManage={canManage}
        onReverse={() => {}}
      />,
    );
  });
  return container;
}

describe("PaymentLedger", () => {
  it("says there are no money rows when the ledger is empty", () => {
    const html = renderLedger([]).textContent ?? "";
    expect(html).toContain("No money rows");
  });

  it("sorts newest first regardless of input order", () => {
    const rows = renderLedger([
      row("old", "2026-11-01T09:00:00.000Z", "payment"),
      row("new", "2026-11-02T09:00:00.000Z", "payment"),
    ]).querySelectorAll("tbody tr");
    expect(rows).toHaveLength(2);
    expect(rows[0].textContent).toContain("2 Nov");
    expect(rows[1].textContent).toContain("1 Nov");
  });

  it("labels tender by kind, channel for plain payments", () => {
    const html = renderLedger([
      row("p", "2026-11-01T09:00:00.000Z", "payment", { channel: "pos" }),
      row("w", "2026-11-02T09:00:00.000Z", "writeOff"),
      row("r", "2026-11-03T09:00:00.000Z", "reversal"),
    ]).textContent;
    expect(html).toContain("POS");
    expect(html).toContain("Write-off");
    expect(html).toContain("Reversal");
  });

  it("marks a reversal row with a minus, and only the un-reversed row keeps Reverse", () => {
    const reversed = row("p", "2026-11-01T09:00:00.000Z", "payment");
    const reversal = row("r", "2026-11-02T09:00:00.000Z", "reversal", {
      reversesId: "p",
    });
    const stillOpen = row("q", "2026-11-03T09:00:00.000Z", "payment");
    const container = renderLedger([reversed, reversal, stillOpen]);

    const amountCells = [...container.querySelectorAll("td")].filter((cell) =>
      /₦/.test(cell.textContent ?? ""),
    );
    // Newest first: the open payment, then the −reversal, then the reversed.
    expect(amountCells[0].textContent).toContain("₦10.00");
    expect(amountCells[1].textContent).toContain("−₦10.00");
    expect(amountCells[1].classList).toContain("text-muted-foreground");
    expect(amountCells[2].textContent).toContain("₦10.00");

    // Only the row no reversal points at offers Reverse.
    const reverseButtons = container.querySelectorAll(
      '[aria-label="Reverse payment"]',
    );
    expect(reverseButtons).toHaveLength(1);
    expect(reverseButtons[0].closest("tr")?.textContent).toContain("3 Nov");
  });

  it("shows no Reverse control to people who cannot manage", () => {
    const container = renderLedger(
      [row("p", "2026-11-01T09:00:00.000Z", "payment")],
      false,
    );
    expect(
      container.querySelectorAll('[aria-label="Reverse payment"]'),
    ).toHaveLength(0);
  });
});
