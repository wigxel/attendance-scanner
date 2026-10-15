// @vitest-environment node

import { useMutation, useQuery } from "convex/react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AlertsSection } from "./alerts-section";

vi.mock("convex/react", () => ({
  useQuery: vi.fn(),
  useMutation: vi.fn(),
}));

// renderToStaticMarkup runs in an SSR world; the EmptyState SSR shim
// would force-hide its non-empty content. Force the client path instead.
vi.mock("@/lib/utils", async (actual) => {
  const utils = await actual<typeof import("@/lib/utils")>();
  return { ...utils, isSSR: () => false };
});

const mockedQuery = vi.mocked(useQuery);
const mockedMutation = vi.mocked(useMutation);

const VAPID_KEY = "BPz1yN2zW3qRybos6UfPBVz6L-rTuMBcu63q4OCzczjYlBBqDKruED6d1";

const ALERT = {
  _id: "alert1",
  type: "temperature_breach",
  roomId: "all",
  dedupeKey: "all:temperature_breach:1",
  detail: "avg 46.3°C (limit 45) — high breach",
  value: 46.3,
  acknowledged: false,
  _creationTime: new Date("2026-10-14T09:30:00Z").getTime(),
};

const acknowledgedAlert = { ...ALERT, acknowledged: true };

// node test env has no serviceWorker, so the mock only needs to dispatch
// the two useQuery calls positionally: recentAlerts first, then
// vapidPublicKey (that reference order matches the component's hooks, and
// convex's anyApi refs aren't stable across accesses to compare directly).
const mockQuery = (alerts: unknown, vapid: string | null) => {
  mockedQuery.mockReset();
  mockedQuery.mockImplementationOnce(() => alerts);
  mockedQuery.mockImplementationOnce(() => vapid);
};

beforeEach(() => {
  vi.clearAllMocks();
  mockedMutation.mockReturnValue({} as never);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("AlertsSection", () => {
  it("renders a skeleton while the query loads", () => {
    mockQuery(undefined, VAPID_KEY);
    const html = renderToStaticMarkup(<AlertsSection />);
    expect(html).toContain("animate-pulse");
  });

  it("renders alert rows with label, detail and acknowledge button", () => {
    mockQuery([ALERT], VAPID_KEY);
    const html = renderToStaticMarkup(<AlertsSection />);
    expect(html).toContain("Temperature");
    expect(html).toContain("avg 46.3°C (limit 45) — high breach");
    expect(html).toContain("bg-amber-500");
    expect(html).toContain("Acknowledge");
  });

  it("drops the acknowledge and pulse from acknowledged rows", () => {
    mockQuery([acknowledgedAlert], null);
    const html = renderToStaticMarkup(<AlertsSection />);
    expect(html).not.toContain("Acknowledge");
    expect(html).not.toContain("bg-amber-500");
  });

  it("shows the empty state when all is clear", () => {
    mockQuery([], null);
    const html = renderToStaticMarkup(<AlertsSection />);
    expect(html).toContain("All clear");
    expect(html).toContain("No anomalies yet");
  });

  it("renders one unacknowledged count in the description", () => {
    mockQuery([ALERT], null);
    const html = renderToStaticMarkup(<AlertsSection />);
    expect(html).toContain("1 unacknowledged");
  });
});
