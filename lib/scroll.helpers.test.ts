import { describe, expect, it } from "vitest";
import { edgeOpacities } from "./scroll.helpers";

const viewport = { clientWidth: 400, scrollWidth: 800 };

describe("edgeOpacities", () => {
  it("hides both edges when there is nothing to scroll", () => {
    expect(
      edgeOpacities({ scrollLeft: 0, clientWidth: 400, scrollWidth: 400 }),
    ).toEqual({ left: 0, right: 0 });
  });

  it("shows only the right edge at the start", () => {
    expect(edgeOpacities({ scrollLeft: 0, ...viewport })).toEqual({
      left: 0,
      right: 1,
    });
  });

  it("shows both edges mid-scroll", () => {
    expect(edgeOpacities({ scrollLeft: 200, ...viewport })).toEqual({
      left: 1,
      right: 1,
    });
  });

  it("fades the right edge over the last 20%", () => {
    expect(edgeOpacities({ scrollLeft: 360, ...viewport }).right).toBeCloseTo(
      0.5,
    );
    expect(edgeOpacities({ scrollLeft: 400, ...viewport }).right).toBe(0);
  });

  it("fades the left edge in over the first 20%", () => {
    expect(edgeOpacities({ scrollLeft: 40, ...viewport }).left).toBeCloseTo(
      0.5,
    );
  });
});
