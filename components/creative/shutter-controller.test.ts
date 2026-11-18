// @vitest-environment jsdom
import { animate } from "motion";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mountShutters, shutterCount } from "./shutter-controller";

const mocks = vi.hoisted(() => ({
  completions: [] as Array<() => void>,
  stop: vi.fn(),
  play: vi.fn(),
  pause: vi.fn(),
}));

vi.mock("motion", () => ({
  animate: vi.fn(() => ({
    // biome-ignore lint/suspicious/noThenProperty: motion's controls are thenable
    then: (onDone: () => void) => {
      mocks.completions.push(onDone);
    },
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

beforeEach(() => {
  mocks.completions.length = 0;
  mocks.stop.mockClear();
  vi.mocked(animate).mockClear();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("shutterCount", () => {
  it("splits 600px into two shutters", () => {
    expect(shutterCount(600)).toBe(2);
  });

  it("never returns less than one shutter", () => {
    expect(shutterCount(0)).toBe(1);
  });
});

describe("mountShutters", () => {
  function mount(host: HTMLElement) {
    const controls = mountShutters(host);
    return {
      controls,
      unmount: () => controls.teardown(),
      cover: host.querySelector<HTMLElement>("[data-shutter-cover]"),
    };
  }

  it("stacks bars covering the parent at their own offsets", () => {
    const host = parent(600);
    const unmount = mountShutters(host).teardown;

    const bars = [...host.children] as HTMLElement[];
    expect(bars).toHaveLength(2);
    expect(bars[0].style.top).toBe("0px");
    expect(bars[0].style.height).toBe("0px");
    expect(bars[1].style.top).toBe("300px");
    expect(bars[1].style.height).toBe("0px");

    unmount();
    expect(host.children).toHaveLength(0);
  });

  it("animates every bar to its slice height, staggered top first", () => {
    const { unmount } = mount(parent(600));

    expect(animate).toHaveBeenCalledTimes(1);
    const [targets, keyframes, options] = vi.mocked(animate).mock
      .calls[0] as unknown as [
      HTMLElement[],
      { height: string },
      { duration: number; delay: (index: number) => number },
    ];
    expect(targets).toHaveLength(2);
    expect(keyframes.height).toBe("300px");
    expect(options.duration).toBe(0.4);
    expect(options.delay(0)).toBe(0);
    expect(options.delay(1)).toBe(0.1);

    unmount();
  });

  it("hides the cover when the animation completes", () => {
    const { cover, unmount } = mount(hostWithCover(600).host);
    const coverEl = cover as HTMLElement;

    expect(coverEl.style.display).toBe("");
    for (const done of mocks.completions) done();
    expect(coverEl.style.display).toBe("none");

    unmount();
  });

  it("hides the cover even when the animation never completes", () => {
    vi.useFakeTimers();
    const { cover, unmount } = mount(hostWithCover(600).host);
    const coverEl = cover as HTMLElement;

    vi.advanceTimersByTime(400 + 100 + 100);

    expect(coverEl.style.display).toBe("none");
    unmount();
  });

  it("teardown stops the animation and removes the bars", () => {
    const { unmount } = mount(hostWithCover(600).host);

    unmount();

    expect(mocks.stop).toHaveBeenCalled();
  });

  it.each([
    ["a", "play"],
    ["s", "pause"],
    ["d", "stop"],
  ] as const)("binds %s to %s", (key, handler) => {
    mount(parent(600));

    window.dispatchEvent(new KeyboardEvent("keydown", { key }));

    expect(mocks[handler]).toHaveBeenCalled();
  });

  it("unbinds the keys on teardown", () => {
    const { unmount } = mount(parent(600));
    unmount();

    window.dispatchEvent(new KeyboardEvent("keydown", { key: "a" }));

    expect(mocks.play).not.toHaveBeenCalled();
  });
});
