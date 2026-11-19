// @vitest-environment jsdom
import { animate } from "motion";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  mountShutters,
  type ShutterControls,
  shutterCount,
} from "./shutter-controller";

const mocks = vi.hoisted(() => ({
  stop: vi.fn(),
  play: vi.fn(),
  pause: vi.fn(),
}));

vi.mock("motion", () => ({
  animate: vi.fn(() => ({
    stop: mocks.stop,
    play: mocks.play,
    pause: mocks.pause,
  })),
  stagger: (seconds: number) => (index: number) => index * seconds,
}));

function parent(height: number) {
  const el = document.createElement("div");
  Object.defineProperty(el, "clientHeight", { value: height });
  return el;
}

function hostWithCover(height: number) {
  const host = parent(height);
  const cover = document.createElement("div");
  cover.setAttribute("data-shutter-cover", "");
  host.appendChild(cover);
  return { host, cover };
}

// Every mount binds window keys; tear them all down between tests so stale
// listeners never answer another test's keypress.
const mounted: ShutterControls[] = [];

function mount(
  host: HTMLElement,
  options?: Parameters<typeof mountShutters>[1],
) {
  const controls = mountShutters(host, options);
  mounted.push(controls);
  return controls;
}

beforeEach(() => {
  mocks.stop.mockClear();
  mocks.play.mockClear();
  mocks.pause.mockClear();
  vi.mocked(animate).mockClear();
});

afterEach(() => {
  for (const controls of mounted) controls.teardown();
  mounted.length = 0;
  vi.unstubAllGlobals();
});

describe("shutterCount", () => {
  it("splits 600px into two shutters at the default target", () => {
    expect(shutterCount(600)).toBe(2);
  });

  it("uses the given target slice height", () => {
    expect(shutterCount(600, 200)).toBe(3);
  });

  it("never returns less than one shutter", () => {
    expect(shutterCount(0)).toBe(1);
  });
});

describe("mountShutters", () => {
  it("mounts full-cover bars at their own offsets", () => {
    const host = parent(600);

    mount(host);

    const bars = [...host.children] as HTMLElement[];
    expect(bars).toHaveLength(2);
    expect(bars[0].style.top).toBe("0px");
    expect(bars[0].style.height).toBe("300px");
    expect(bars[0].style.transformOrigin).toBe("bottom");
    expect(bars[1].style.top).toBe("300px");
    expect(bars[1].style.height).toBe("300px");
  });

  it("hides the pre-hydration cover as soon as the bars are in place", () => {
    const { host, cover } = hostWithCover(600);

    mount(host);

    expect(cover.style.display).toBe("none");
  });

  it("does not animate until started", () => {
    mount(parent(600));

    expect(animate).not.toHaveBeenCalled();
  });

  it("pre-zooms the child behind the bars", () => {
    const host = parent(600);
    const child = document.createElement("div");
    host.appendChild(child);

    mount(host);

    expect(child.style.transform).toBe("scale(1.5)");
  });

  it("start animates the bars and the child, lazily", () => {
    const host = parent(600);
    const child = document.createElement("div");
    host.appendChild(child);
    const controls = mount(host);

    controls.start();

    expect(animate).toHaveBeenCalledTimes(2);
    const barsCall = vi.mocked(animate).mock.calls[0] as unknown as [
      HTMLElement[],
      Record<string, unknown>,
      { duration: number; delay: (index: number) => number },
    ];
    const childCall = vi.mocked(animate).mock.calls[1] as unknown as [
      HTMLElement,
      Record<string, unknown>,
      { duration: number },
    ];
    expect(barsCall[0]).toHaveLength(2);
    expect(barsCall[1]).toEqual({ scaleY: 0 });
    expect(barsCall[2].duration).toBe(0.4);
    expect(barsCall[2].delay(0)).toBe(0);
    expect(barsCall[2].delay(1)).toBe(0.1);
    expect(childCall[0]).toBe(child);
    expect(childCall[1]).toEqual({ scale: 1 });
    expect(childCall[2].duration).toBe(0.9);
    expect(mocks.play).toHaveBeenCalledTimes(2);

    // A second start replays the same animations instead of building more.
    controls.start();
    expect(animate).toHaveBeenCalledTimes(2);
  });

  it("pause freezes both animations", () => {
    const controls = mount(parent(600));

    controls.start();
    controls.pause();

    expect(mocks.pause).toHaveBeenCalledTimes(2);
  });

  it("reset restores the cover and pre-zoom, and the next start replays", () => {
    const host = parent(600);
    const child = document.createElement("div");
    host.appendChild(child);
    const controls = mount(host);

    controls.start();
    controls.reset();

    expect(mocks.stop).toHaveBeenCalledTimes(2);
    // The child comes first in the host; the bars follow.
    const bars = ([...host.children] as HTMLElement[]).slice(1);
    expect(bars.every((bar) => bar.style.transform === "")).toBe(true);
    expect(child.style.transform).toBe("scale(1.5)");

    controls.start();
    expect(animate).toHaveBeenCalledTimes(4);
  });

  it("honours an explicit heightPx", () => {
    const host = parent(600);

    mount(host, { heightPx: 200 });

    const bars = [...host.children] as HTMLElement[];
    expect(bars).toHaveLength(3);
    expect(bars[2].style.top).toBe("400px");
    expect(bars[2].style.height).toBe("200px");
  });

  it("reads --shutter-height from the parent as px", () => {
    vi.stubGlobal(
      "getComputedStyle",
      vi.fn(() => ({
        getPropertyValue: (name: string) =>
          name === "--shutter-height" ? "200px" : "",
        fontSize: "16px",
      })),
    );

    const host = parent(600);

    mount(host);

    expect([...host.children]).toHaveLength(3);
  });

  it.each([
    ["a", () => expect(animate).toHaveBeenCalled()],
    ["s", () => expect(mocks.pause).toHaveBeenCalled()],
    ["d", () => expect(mocks.stop).toHaveBeenCalled()],
  ] as const)("binds %s to its control", (key, assert) => {
    const controls = mount(parent(600));
    if (key !== "a") {
      // pause/reset act on the running animation; start it first.
      controls.start();
    }

    window.dispatchEvent(new KeyboardEvent("keydown", { key }));

    assert();
  });

  it("ignores held-down repeats", () => {
    mount(parent(600));

    window.dispatchEvent(
      new KeyboardEvent("keydown", { key: "a", repeat: true }),
    );

    expect(animate).not.toHaveBeenCalled();
  });

  it("unbinds the keys on teardown", () => {
    const host = parent(600);
    const child = document.createElement("div");
    host.appendChild(child);
    const controls = mount(host);
    controls.start();
    controls.teardown();

    window.dispatchEvent(new KeyboardEvent("keydown", { key: "a" }));

    expect(animate).toHaveBeenCalledTimes(2); // start only, not the keypress
    // Only the child remains; the controller-owned bars are gone.
    expect(host.querySelectorAll("div")).toHaveLength(1);
    expect(child.style.transform).toBe("");
  });
});
