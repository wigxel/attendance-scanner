import { animate, stagger } from "motion";
import { getCssVarInPx } from "@/lib/css.helpers";

const SHUTTER_TARGET_PX = 300;

type ShutterOptions = {
  color?: string;
  /** Shutter slice height in px; overrides --shutter-height. */
  heightPx?: number;
  /** Gap between bars starting, in ms. */
  staggerMs?: number;
  /** Per-bar grow time, in ms. */
  durationMs?: number;
};

/** start/pause/reset drive the animation; keys a/s/d are bound to them. */
export type ShutterControls = {
  start: () => void;
  pause: () => void;
  /** Cancels the reveal, clears the animation and puts every bar back at
   * full cover, so the next start plays fresh. */
  reset: () => void;
  /** Removes the bars, the key bindings and the timers. */
  teardown: () => void;
};

/** Shutter count for a parent height, given the target slice height. */
export function shutterCount(height: number, target = SHUTTER_TARGET_PX) {
  return Math.max(1, Math.round(height / target));
}

/** Slice height: option wins, else --shutter-height on the parent (inherited
 * vars included) resolved to px, else 300px. */
function shutterHeightFor(parent: HTMLElement, heightPx?: number) {
  if (heightPx !== undefined) return heightPx;
  const resolved = getCssVarInPx(parent, "--shutter-height");

  return resolved > 0 ? resolved : SHUTTER_TARGET_PX;
}

/**
 * Covers `parent` with full-width shutter bars, one per ~300px slice, all
 * mounted at full height so nothing shows through. Pressing start (key `a`)
 * shrinks them to height 0 in a top-first stagger, revealing what is under
 * them; `s` pauses and `d` resets (full cover again). A [data-shutter-cover]
 * element present at mount (pre-hydration paint) is hidden right away, once
 * the bars are in place. Returns the controls; keys a/s/d are bound for you.
 */
export function mountShutters(
  parent: HTMLElement | null,
  {
    color = "var(--shutter-color, var(--primary))",
    heightPx,
    staggerMs = 100,
    durationMs = 400,
  }: ShutterOptions = {},
): ShutterControls {
  if (!parent) {
    const noop = () => {};
    return { start: noop, pause: noop, reset: noop, teardown: noop };
  }

  const height = parent.clientHeight;
  const target = shutterHeightFor(parent, heightPx);
  const count = shutterCount(height, target);
  const slice = height / count;
  const shutters: HTMLElement[] = [];

  for (let i = 0; i < count; i++) {
    const bar = document.createElement("div");
    Object.assign(bar.style, {
      position: "absolute",
      left: "0",
      top: `${i * slice}px`,
      width: "100%",
      height: `${slice}px`,
      // Collapse toward the bottom edge: the top of the image shows first.
      transformOrigin: "bottom",
      backgroundColor: color,
    });
    parent.appendChild(bar);
    shutters.push(bar);
  }

  // The bars now cover everything; the pre-hydration cover can go.
  const cover = parent.querySelector<HTMLElement>("[data-shutter-cover]");
  if (cover) cover.style.display = "none";

  // The child sits behind the bars, pre-zoomed until the reveal begins.
  const child = parent.firstElementChild as HTMLElement | null;
  if (child) child.style.transform = "scale(1.5)";

  let animation: ReturnType<typeof animate> | undefined;
  let imageAnimation: ReturnType<typeof animate> | undefined;

  const controls: ShutterControls = {
    start: () => {
      const DURATION = durationMs / 1000;

      animation ??= animate(
        shutters,
        { scaleY: 0 },
        {
          duration: DURATION,
          delay: stagger(staggerMs / 1000),
          ease: "easeOut",
        },
      );
      animation.play();

      if (child) {
        imageAnimation ??= animate(
          child,
          { scale: 1 },
          { duration: DURATION + 0.5, ease: "easeOut" },
        );
        imageAnimation.play();
      }
    },
    pause: () => {
      animation?.pause();
      imageAnimation?.pause();
    },
    reset: () => {
      animation?.stop();
      imageAnimation?.stop();
      animation = undefined;
      imageAnimation = undefined;
      // Back to full cover and pre-zoom; the next start plays fresh.
      for (const bar of shutters) bar.style.transform = "";
      if (child) child.style.transform = "scale(1.5)";
    },
    teardown: () => {
      animation?.stop();
      imageAnimation?.stop();
      window.removeEventListener("keydown", onKeyDown);
      for (const bar of shutters) bar.remove();
      if (child) child.style.transform = "";
    },
  };

  const onKeyDown = (event: KeyboardEvent) => {
    if (event.repeat) return;
    if (event.key === "a") controls.start();
    else if (event.key === "s") controls.pause();
    else if (event.key === "d") controls.reset();
  };
  window.addEventListener("keydown", onKeyDown);

  return controls;
}
