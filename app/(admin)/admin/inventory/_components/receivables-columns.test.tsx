// @vitest-environment node

import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { Receivable } from "@/convex/inventory";
import {
  receivableSearchText,
  receivablesColumns,
} from "./receivables-columns";

const customerCell = (receivable: Receivable) => {
  const column = receivablesColumns.find((entry) => entry.id === "customer");
  if (!column || typeof column.cell !== "function") {
    throw new Error("customer cell missing");
  }
  // RenderCell props: only row.original is read here.
  return renderToStaticMarkup(
    column.cell({
      row: { original: receivable },
    } as never),
  );
};

const overdueCell = (receivable: Receivable) => {
  const column = receivablesColumns.find((entry) => entry.id === "overdueKobo");
  if (!column || typeof column.cell !== "function") {
    throw new Error("overdue cell missing");
  }
  return renderToStaticMarkup(
    column.cell({
      row: { original: receivable },
    } as never),
  );
};

const receivable: Receivable = {
  customerId: "c1",
  customerName: "Ada Obi",
  totalOwedKobo: 450000,
  oldestUnpaidAt: "2026-11-01T09:00:00.000Z",
  overdueKobo: 0,
  oldestOverdueDueDate: null,
  daysOverdue: null,
};

describe("receivables customer cell", () => {
  it("shows the customer name", () => {
    expect(customerCell(receivable)).toContain("Ada Obi");
  });

  it("says Deleted customer and shows the raw profile id when the profile is gone", () => {
    const html = customerCell({ ...receivable, customerName: null });

    expect(html).toContain("Deleted customer");
    expect(html).toContain("c1");
    expect(html).not.toContain("Ada Obi");
  });

  it("keeps the raw id in the search text either way", () => {
    for (const customerName of [receivable.customerName, null]) {
      expect(receivableSearchText({ ...receivable, customerName })).toContain(
        "c1",
      );
    }
  });
});

describe("receivables overdue cell", () => {
  it("shows nothing for a customer with nothing overdue", () => {
    expect(overdueCell(receivable)).not.toContain("₦");
  });

  it("shows the overdue amount and how many days late", () => {
    const html = overdueCell({
      ...receivable,
      overdueKobo: 200000,
      daysOverdue: 12,
    });

    expect(html).toContain("2,000.00");
    expect(html).toContain("12 days late");
  });

  it("says day, not days, when one day late", () => {
    const html = overdueCell({
      ...receivable,
      overdueKobo: 5000,
      daysOverdue: 1,
    });

    expect(html).toContain("1 day late");
    expect(html).not.toContain("1 days late");
  });
});
