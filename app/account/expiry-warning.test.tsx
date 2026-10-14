// @vitest-environment node

import { useQuery } from "convex/react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ExpiryWarning } from "./expiry-warning";

vi.mock("convex/react", () => ({ useQuery: vi.fn() }));

const mockedQuery = vi.mocked(useQuery);

beforeEach(() => {
  vi.clearAllMocks();
});

function sub(daysLeft: number, durationType: "week" | "month") {
  return { endDate: "2030-10-20", daysLeft, durationType };
}

describe("ExpiryWarning", () => {
  it("renders nothing while the query loads or when there is none", () => {
    mockedQuery.mockReturnValue(undefined as never);
    expect(renderToStaticMarkup(<ExpiryWarning />)).toBe("");
    mockedQuery.mockReturnValue(null as never);
    expect(renderToStaticMarkup(<ExpiryWarning />)).toBe("");
  });

  it("warns a monthly subscriber 5 days out", () => {
    mockedQuery.mockReturnValue(sub(5, "month") as never);
    const html = renderToStaticMarkup(<ExpiryWarning />);
    expect(html).toContain("Subscription expiring soon");
    expect(html).toContain("5 days");
  });

  it("stays silent for a monthly subscriber 6 days out", () => {
    mockedQuery.mockReturnValue(sub(6, "month") as never);
    expect(renderToStaticMarkup(<ExpiryWarning />)).toBe("");
  });

  it("warns a weekly subscriber 2 days out", () => {
    mockedQuery.mockReturnValue(sub(2, "week") as never);
    const html = renderToStaticMarkup(<ExpiryWarning />);
    expect(html).toContain("Subscription expiring soon");
    expect(html).toContain("2 days");
  });

  it("stays silent for a weekly subscriber 3 days out", () => {
    mockedQuery.mockReturnValue(sub(3, "week") as never);
    expect(renderToStaticMarkup(<ExpiryWarning />)).toBe("");
  });

  it("singularizes 1 day", () => {
    mockedQuery.mockReturnValue(sub(1, "week") as never);
    const html = renderToStaticMarkup(<ExpiryWarning />);
    expect(html).toContain("1 day (");
    expect(html).not.toContain("1 days");
  });

  it("says expires-today on the last day", () => {
    mockedQuery.mockReturnValue(sub(0, "month") as never);
    const html = renderToStaticMarkup(<ExpiryWarning />);
    expect(html).toContain("Expires today");
  });

  it("shows the renew action only on the last day", () => {
    mockedQuery.mockReturnValue(sub(0, "month") as never);
    const html = renderToStaticMarkup(<ExpiryWarning />);
    expect(html).toContain('href="/reserve"');
    expect(html).toContain("Renew now");
  });

  it("hides the renew action while days remain", () => {
    mockedQuery.mockReturnValue(sub(5, "month") as never);
    const html = renderToStaticMarkup(<ExpiryWarning />);
    expect(html).toContain("Subscription expiring soon");
    expect(html).not.toContain("Renew now");
  });
});
