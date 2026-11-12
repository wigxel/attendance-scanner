// @vitest-environment node

import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { InventoryMetrics } from "@/convex/inventory";
import { useMetrics } from "./metrics-context";
import { MetricsRevenueSection } from "./metrics-revenue-section";

vi.mock("./metrics-context", () => ({ useMetrics: vi.fn() }));

const mockedUseMetrics = vi.mocked(useMetrics);

function metrics(revenue: Partial<InventoryMetrics["revenue"]>) {
  return {
    metrics: {
      revenue: {
        totalKobo: 0,
        collectedKobo: 0,
        outstandingKobo: 0,
        salesCount: 0,
        byChannel: [],
        ...revenue,
      },
    },
  } as unknown as ReturnType<typeof useMetrics>;
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("MetricsRevenueSection", () => {
  it("shows booked, collected and owed on their own bases", () => {
    mockedUseMetrics.mockReturnValue(
      metrics({
        totalKobo: 100_000,
        collectedKobo: 250_000,
        outstandingKobo: 40_000,
      }),
    );

    const html = renderToStaticMarkup(<MetricsRevenueSection />);

    expect(html).toContain("Booked");
    expect(html).toContain("1,000.00");
    expect(html).toContain("Collected (all sales)");
    expect(html).toContain("2,500.00");
    expect(html).toContain("Owed on this period&#x27;s sales");
    expect(html).toContain("400.00");
    expect(html).toContain("do not add up to each other");
  });

  it("lists credit as a channel", () => {
    mockedUseMetrics.mockReturnValue(
      metrics({ byChannel: [{ channel: "credit", totalKobo: 500_000 }] }),
    );

    const html = renderToStaticMarkup(<MetricsRevenueSection />);

    expect(html).toContain("Credit");
    expect(html).toContain("5,000.00");
  });
});
