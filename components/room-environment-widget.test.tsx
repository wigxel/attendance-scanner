// @vitest-environment node
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useQuery } from "convex/react";
import { RoomEnvironmentWidget } from "./room-environment-widget";

vi.mock("convex/react", () => ({ useQuery: vi.fn() }));

const mockedQuery = vi.mocked(useQuery);

const liveBucket = {
  _id: "bucket1",
  _creationTime: 0,
  roomId: "all",
  bucketStart: 0,
  avgTemperature: 24,
  avgHumidity: 55,
  avgPressure: 1012,
  count: 6,
  updatedAt: 0,
};

const stripRow = (date: string, avgTemperature: number | null) =>
  avgTemperature === null
    ? {
        date,
        avgTemperature: null,
        minTemperature: null,
        maxTemperature: null,
        count: 0,
      }
    : {
        date,
        avgTemperature,
        minTemperature: avgTemperature - 2,
        maxTemperature: avgTemperature + 2,
        count: 48,
      };

const nullStrip = [
  "2026-10-05",
  "2026-10-06",
  "2026-10-07",
  "2026-10-08",
  "2026-10-09",
  "2026-10-10",
  "2026-10-11",
].map((date) => stripRow(date, null));

beforeEach(() => {
  vi.clearAllMocks();
});

describe("RoomEnvironmentWidget", () => {
  it("renders loading skeleton while queries are pending", () => {
    mockedQuery.mockReturnValue(undefined as never);
    const html = renderToStaticMarkup(<RoomEnvironmentWidget />);
    expect(html).toContain("animate-pulse");
    expect(mockedQuery).toHaveBeenCalledWith(expect.anything(), {
      roomId: "all",
    });
  });

  it("renders empty state when no readings exist", () => {
    mockedQuery.mockImplementation(((
      _reference: unknown,
      args?: { asOf?: number },
    ) => (args?.asOf ? nullStrip : null)) as never);
    const html = renderToStaticMarkup(<RoomEnvironmentWidget roomId="all" />);
    expect(html).toContain("No readings yet");
  });

  it("renders flip values and 7 heat dots", () => {
    const filledStrip = [
      stripRow("2026-10-05", 23.5),
      stripRow("2026-10-06", 24.5),
      stripRow("2026-10-07", 22.5),
      stripRow("2026-10-08", null),
      stripRow("2026-10-09", null),
      stripRow("2026-10-10", null),
      stripRow("2026-10-11", null),
    ];
    mockedQuery.mockImplementation(((
      _reference: unknown,
      args?: { asOf?: number },
    ) => (args?.asOf ? filledStrip : liveBucket)) as never);
    const html = renderToStaticMarkup(<RoomEnvironmentWidget />);
    expect(html).toContain("24.0°C");
    expect(html).toContain("55%");
    expect(html).toContain("Last 7 days");
    expect(html).toContain("Avg 23.5°C");
    expect(html).toContain("border-dashed");
  });
});
