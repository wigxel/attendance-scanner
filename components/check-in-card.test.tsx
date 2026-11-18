// @vitest-environment node

import { useQuery } from "convex/react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useCheckInMode } from "@/hooks/flags";
import { CheckedInConfirmation } from "./CheckInCard";

vi.mock("convex/react", () => ({ useQuery: vi.fn() }));
vi.mock("@/hooks/flags", () => ({ useCheckInMode: vi.fn() }));

const mockedQuery = vi.mocked(useQuery);
const mockedMode = vi.mocked(useCheckInMode);

beforeEach(() => {
  vi.clearAllMocks();
  mockedMode.mockReturnValue("staff_scan" as never);
});

describe("CheckedInConfirmation", () => {
  it("renders nothing while the query loads or before staff scan lands", () => {
    mockedQuery.mockReturnValue(undefined as never);
    expect(renderToStaticMarkup(<CheckedInConfirmation />)).toBe("");
    mockedQuery.mockReturnValue(false as never);
    expect(renderToStaticMarkup(<CheckedInConfirmation />)).toBe("");
  });

  it("confirms check-in when staff scan lands", () => {
    mockedQuery.mockReturnValue(true as never);
    const html = renderToStaticMarkup(<CheckedInConfirmation />);
    expect(html).toContain("Checked in");
    expect(html).toContain("Staff confirmed your check-in");
  });

  it("stays out of self-service modes, which have their own card", () => {
    mockedMode.mockReturnValue("one_tap" as never);
    mockedQuery.mockReturnValue(true as never);
    expect(renderToStaticMarkup(<CheckedInConfirmation />)).toBe("");
  });
});
