// @vitest-environment node

import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { InventoryMetrics } from "@/convex/inventory";
import { MetricsCards } from "./metrics-cards";
import { useMetrics } from "./metrics-context";

vi.mock("./metrics-context", () => ({ useMetrics: vi.fn() }));

const mockedUseMetrics = vi.mocked(useMetrics);

function metrics(revenue: Partial<InventoryMetrics["revenue"]>) {
  return {
    metrics: {
      stock: { valueKobo: 0, productCount: 0, lowCount: 0, outCount: 0 },
      spend: { totalKobo: 0 },
      revenue: {
        totalKobo: 0,
        collectedKobo: 0,
        outstandingKobo: 0,
        salesCount: 0,
        byChannel: [],
        ...revenue,
      },
      margin: { grossMarginKobo: 0, grossMarginPercent: null, cogsKobo: 0 },
    },
  } as unknown as ReturnType<typeof useMetrics>;
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("MetricsCards", () => {
  it("shows booked, collected and owed behind an info icon", () => {
    mockedUseMetrics.mockReturnValue(
      metrics({
        totalKobo: 100_000,
        collectedKobo: 250_000,
        outstandingKobo: 40_000,
      }),
    );

    const html = renderToStaticMarkup(<MetricsCards />);

    expect(html).toContain("Booked");
    expect(html).toContain("1,000.00");
    expect(html).toContain("Collected");
    expect(html).toContain("2,500.00");
    expect(html).toContain("Owed");
    expect(html).toContain("400.00");
    // The basis copy sits in a tooltip on an info icon by each label.
    expect(html).toContain('aria-label="About Owed"');
  });
});
