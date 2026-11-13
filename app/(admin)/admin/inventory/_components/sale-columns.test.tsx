// @vitest-environment node

import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { Id } from "@/convex/components/inventory/_generated/dataModel";
import type { SaleStatus, SaleSummary } from "@/convex/inventory";
import { SaleStatusBadge, SaleTotalCell } from "./sale-columns";

const sale: SaleSummary = {
  _id: "sale1" as Id<"sales">,
  _creationTime: 0,
  occurredAt: "2026-11-10T10:00:00.000Z",
  channel: "credit",
  customerId: "c1",
  totalKobo: 500000,
  voided: false,
  createdBy: "p1",
  createdAt: "2026-11-10T10:00:00.000Z",
  customerName: "Ada",
  lineCount: 1,
  items: [{ id: "line1", name: "Rice", quantity: 2 }],
  paidKobo: 200000,
  writtenOffKobo: 0,
  outstandingKobo: 300000,
  status: "part_paid",
};

const statusLabels: Record<SaleStatus, string> = {
  paid: "Paid",
  part_paid: "Part-paid",
  unpaid: "Unpaid",
  written_off: "Written off",
  voided: "Voided",
};

describe("SaleStatusBadge", () => {
  it("names every derived status", () => {
    for (const [status, label] of Object.entries(statusLabels)) {
      const html = renderToStaticMarkup(
        <SaleStatusBadge status={status as SaleStatus} />,
      );

      expect(html).toContain(`>${label}</span>`);
    }
  });

  it("no longer calls a paid sale completed", () => {
    const html = renderToStaticMarkup(<SaleStatusBadge status="paid" />);

    expect(html).not.toContain("Completed");
  });
});

describe("SaleTotalCell", () => {
  it("adds a muted line for what is still owed", () => {
    const html = renderToStaticMarkup(<SaleTotalCell sale={sale} />);

    expect(html).toContain("5,000.00");
    expect(html).toContain("3,000.00 due");
    expect(html).toContain("text-muted-foreground");
  });

  it("shows only the total when nothing is owed", () => {
    const html = renderToStaticMarkup(
      <SaleTotalCell sale={{ ...sale, outstandingKobo: 0 }} />,
    );

    expect(html).not.toContain("due");
    expect(html).not.toContain("text-muted-foreground");
  });
});
