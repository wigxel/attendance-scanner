// @vitest-environment jsdom
import { renderHook } from "@testing-library/react";
import posthog from "posthog-js";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useTrackOpen } from "./useTrackOpen";

vi.mock("posthog-js", () => ({ default: { capture: vi.fn() } }));

beforeEach(() => {
  vi.mocked(posthog.capture).mockClear();
});

describe("useTrackOpen", () => {
  type HookProps = { open: boolean };

  it("fires once per closed → open transition, not on close or while open", () => {
    const { rerender } = renderHook(
      ({ open }: HookProps) => useTrackOpen("inventory_x", open),
      { initialProps: { open: false } as HookProps },
    );

    rerender({ open: true });
    rerender({ open: true });
    rerender({ open: false });
    rerender({ open: true });

    expect(posthog.capture).toHaveBeenCalledTimes(2);
    expect(posthog.capture).toHaveBeenNthCalledWith(
      1,
      "inventory_x",
      undefined,
    );
  });
});
