import posthog from "posthog-js";
import { describe, expect, it, vi } from "vitest";
import { track } from "./analytics";

vi.mock("posthog-js", () => ({ default: { capture: vi.fn() } }));

describe("track", () => {
  it("captures the event with its properties", () => {
    track("inventory_sale_recorded", { channel: "cash" });
    expect(posthog.capture).toHaveBeenCalledWith("inventory_sale_recorded", {
      channel: "cash",
    });
  });
});
