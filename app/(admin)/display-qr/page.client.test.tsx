// @vitest-environment node

import { describe, expect, it } from "vitest";
import { nextRefreshDelay } from "./page.client";

describe("nextRefreshDelay", () => {
  it("waits the full refresh window after a successful refresh", () => {
    expect(nextRefreshDelay(true)).toBe(5 * 60 * 1000);
  });

  it("retries quickly after a failed refresh so a dead QR is not left up", () => {
    expect(nextRefreshDelay(false)).toBe(15 * 1000);
  });
});
