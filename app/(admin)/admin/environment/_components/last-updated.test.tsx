// @vitest-environment node

import { useQuery } from "convex/react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { LastUpdated } from "./last-updated";

vi.mock("convex/react", () => ({ useQuery: vi.fn() }));

const mockedQuery = vi.mocked(useQuery);

const MIN = 60 * 1000;

beforeEach(() => {
  vi.clearAllMocks();
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-10-14T14:30:00.000Z"));
});

afterEach(() => {
  vi.useRealTimers();
});

describe("LastUpdated", () => {
  it("renders a skeleton while the query loads", () => {
    mockedQuery.mockReturnValue(undefined as never);
    const html = renderToStaticMarkup(<LastUpdated />);
    expect(html).toContain("animate-pulse");
    expect(mockedQuery).toHaveBeenCalledWith(expect.anything(), {});
  });

  it("shows the empty state with no dot when the store never wrote", () => {
    mockedQuery.mockReturnValue({ timestamp: null } as never);
    const html = renderToStaticMarkup(<LastUpdated />);
    expect(html).toContain("No data yet");
    expect(html).not.toContain("bg-emerald-500");
    expect(html).not.toContain("bg-amber-500");
  });

  it("marks a fresh update live and says how long ago", () => {
    mockedQuery.mockReturnValue({ timestamp: Date.now() - 3 * MIN } as never);
    const html = renderToStaticMarkup(<LastUpdated />);
    expect(html).toContain("bg-emerald-500");
    expect(html).toContain("Last update");
    expect(html).toContain("3 min ago");
    expect(html).not.toContain("stale");
    expect(html).not.toContain("bg-amber-500");
  });

  it("marks the feed stale after 15 minutes without a write", () => {
    mockedQuery.mockReturnValue({ timestamp: Date.now() - 20 * MIN } as never);
    const html = renderToStaticMarkup(<LastUpdated />);
    expect(html).toContain("bg-amber-500");
    expect(html).toContain("stale");
    expect(html).not.toContain("bg-emerald-500");
  });

  it("sits on the age boundary: 15 min flat is stale", () => {
    mockedQuery.mockReturnValue({ timestamp: Date.now() - 15 * MIN } as never);
    const html = renderToStaticMarkup(<LastUpdated />);
    expect(html).toContain("stale");
  });

  it("falls back to absolute-only phrasing after a day", () => {
    mockedQuery.mockReturnValue({
      timestamp: Date.now() - 2 * 24 * 60 * MIN,
    } as never);
    const html = renderToStaticMarkup(<LastUpdated />);
    expect(html).toContain("2d ago");
  });
});
