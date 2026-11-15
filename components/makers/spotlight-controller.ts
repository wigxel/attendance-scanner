import type { RefObject } from "react";

// Calibration knobs: minimum time between spotlight wipes (throttle), the
// boundary line's offset from the spotlight frame's top edge, and the height
// of the activation band below it. A card is active while its box overlaps
// the band. Tweak while SPOTLIGHT_DEBUG shows the band, then leave alone.
export const SPOTLIGHT_THROTTLE_MS = 250;
export const SPOTLIGHT_BOUNDARY_OFFSET_PX = 0;
export const SPOTLIGHT_BOUNDARY_RANGE_PX = 200;

// Debug: red boundary band, card + frame outlines. Flip to true while
// calibrating; the controller and the debug UI both read it.
export const SPOTLIGHT_DEBUG = false;

// Curtain reveal, stack reversed: entry 0 paints on top, the last at the
// bottom. A card is active while its box straddles the boundary band: passed
// cards rest wiped up, not-yet-arrived cards rest wiped down (hidden), the
// straddler is open.
const OPEN_CLIP = "inset(0 0 0 0)";
const WIPED_CLIP = "inset(0 0 100% 0)";
const PENDING_CLIP = "inset(100% 0 0 0)";

export function clipFor(i: number, activeIdx: number) {
  return i < activeIdx ? WIPED_CLIP : OPEN_CLIP;
}

/**
 * Owns the spotlight's activation imperatively: a scroll + rAF loop computes
 * the boundary band (anchored to the spotlight frame's live top edge), finds
 * the card straddling it, and writes clip paths + opacities straight to the
 * DOM — diff-based, so transitions never restart. Nothing here re-renders
 * React.
 */
export function createSpotlightController(refs: {
  clips: RefObject<(HTMLDivElement | null)[]>;
  cards: RefObject<(HTMLDivElement | null)[]>;
  frame: RefObject<HTMLDivElement | null>;
  debugLine: RefObject<HTMLDivElement | null>;
  counter?: RefObject<HTMLDivElement | null>;
  activeName?: RefObject<HTMLDivElement | null>;
  meta?: ReadonlyArray<{ label: string; color: string }>;
  count: number;
  debug: boolean;
}) {
  let lastFire = 0;
  let raf = 0;
  let lastFrameHeight = 0;
  let pending: {
    timer: ReturnType<typeof setTimeout>;
    snapshot: { target: string[]; active: number };
  } | null = null;
  let lastSnapshot: { target: string[]; active: number } = {
    target: [],
    active: 0,
  };
  const applied = new Map<HTMLElement, string>();

  const paintDebug = (line: number) => {
    if (!refs.debug) return;
    const el = refs.debugLine.current;
    if (!el) return;
    el.style.transform = `translateY(${line}px)`;
    const label = el.querySelector("[data-boundary-label]");
    if (label) {
      label.textContent = `${Math.round(line)}px → ${Math.round(line + SPOTLIGHT_BOUNDARY_RANGE_PX)}px`;
    }
  };

  // Boundary = the sticky frame's live top edge (viewport Y of the
  // spotlight's top), plus a tuning offset. The activation band extends
  // SPOTLIGHT_BOUNDARY_RANGE_PX below it.
  const computeLine = () => {
    const frame = refs.frame.current;
    const base = frame ? frame.getBoundingClientRect().top : 0;
    return base + SPOTLIGHT_BOUNDARY_OFFSET_PX;
  };

  // The last leader box keeps a runway (padding-bottom) as tall as the
  // spotlight frame minus the activation band (minus a 40px tail): the band
  // already keeps the last card active for RANGE extra pixels, so the page
  // needs that much less scroll after it.
  const syncRunway = () => {
    const frame = refs.frame.current;
    const last = (refs.cards.current ?? [])[refs.count - 1];
    if (!frame || !last) return;
    const height = frame.offsetHeight;
    if (height === lastFrameHeight) return;
    lastFrameHeight = height;
    const runway = height - (SPOTLIGHT_BOUNDARY_RANGE_PX - 40);
    last.style.paddingBottom = `${runway}px`;
  };

  // Target clip per card: box below the band = wiped down (hidden); box
  // above the band = wiped up (passed); box overlapping the band = open (the
  // active one). Several cards can overlap the band on short viewports — the
  // topmost straddler wins.
  const computeTarget = () => {
    const line = computeLine();
    paintDebug(line);
    const bandEnd = line + SPOTLIGHT_BOUNDARY_RANGE_PX;

    const target: string[] = [];
    let straddler = -1;
    for (const [i, el] of (refs.cards.current ?? []).entries()) {
      if (!el) {
        target[i] = OPEN_CLIP;
        continue;
      }
      const rect = el.getBoundingClientRect();
      if (rect.bottom < line) {
        target[i] = WIPED_CLIP;
      } else if (rect.top > bandEnd) {
        target[i] = PENDING_CLIP;
      } else {
        target[i] = OPEN_CLIP;
        if (straddler === -1) straddler = i;
      }
    }

    // At page bottom the last card can sit wholly below the line; it takes
    // over so the section never ends on an empty pile.
    const atBottom =
      window.scrollY + window.innerHeight >=
      document.documentElement.scrollHeight - 1;
    if (straddler === -1 && atBottom) target[refs.count - 1] = OPEN_CLIP;

    const active =
      straddler !== -1 ? straddler : atBottom ? refs.count - 1 : -1;

    return { target, active };
  };

  const write = (snapshot: { target: string[]; active: number }) => {
    for (const [i, el] of (refs.clips.current ?? []).entries()) {
      if (!el) continue;
      const next = snapshot.target[i] ?? OPEN_CLIP;
      if (applied.get(el) === next) continue;
      applied.set(el, next);
      el.style.clipPath = next;
      el.setAttribute("aria-hidden", String(next !== OPEN_CLIP));
    }

    // Inactive leader boxes dim to half opacity; the active one is full.
    for (const [i, el] of (refs.cards.current ?? []).entries()) {
      if (!el) continue;
      const next = snapshot.target[i] === OPEN_CLIP ? "1" : "0.5";
      if (applied.get(el) === next) continue;
      applied.set(el, next);
      el.style.opacity = next;
    }

    // The rolling index counter rides on the active card (1-based display);
    // CSS derives the offset from --counter-index and the inherited
    // font-size.
    const counter = refs.counter?.current;
    if (counter && snapshot.active >= 0) {
      counter.style.setProperty("--counter-index", String(snapshot.active + 1));
    }

    // The active tribe name + its colour, written straight to the shell.
    const nameEl = refs.activeName?.current;
    const meta = refs.meta?.[snapshot.active];
    if (nameEl && meta) {
      nameEl.textContent = meta.label;
      nameEl.style.setProperty("--active-tribe-color", meta.color);
    }
    lastSnapshot = snapshot;
  };

  const sameClips = (a: string[], b: string[]) =>
    a.length === b.length && a.every((clip, i) => clip === b[i]);

  const sameTarget = (
    a: { target: string[]; active: number },
    b: { target: string[]; active: number },
  ) => sameClips(a.target, b.target) && a.active === b.active;

  const frameTick = () => {
    syncRunway();
    const snapshot = computeTarget();
    if (sameTarget(snapshot, lastSnapshot)) return;

    // A wipe is already queued for this window; it fires with the latest
    // snapshot when the window ends.
    if (pending) {
      pending.snapshot = snapshot;
      return;
    }

    const elapsed = Date.now() - lastFire;
    if (elapsed >= SPOTLIGHT_THROTTLE_MS) {
      lastFire = Date.now();
      write(snapshot);
      return;
    }

    const timer = setTimeout(() => {
      const held = pending;
      pending = null;
      if (held) {
        lastFire = Date.now();
        write(held.snapshot);
      }
    }, SPOTLIGHT_THROTTLE_MS - elapsed);
    pending = { timer, snapshot };
  };

  const onScroll = () => {
    if (raf) return;
    raf = requestAnimationFrame(() => {
      raf = 0;
      frameTick();
    });
  };

  // First paint: settle to the true straddle state with transitions
  // suppressed, so the pile doesn't animate from its SSR defaults on load.
  const settle = () => {
    syncRunway();
    const snapshot = computeTarget();
    const suppress = (el: HTMLElement, mutate: () => void) => {
      const prevTransition = el.style.transition;
      el.style.transition = "none";
      mutate();
      void el.offsetHeight;
      el.style.transition = prevTransition;
    };

    for (const [i, el] of (refs.clips.current ?? []).entries()) {
      if (!el) continue;
      const next = snapshot.target[i] ?? OPEN_CLIP;
      applied.set(el, next);
      suppress(el, () => {
        el.style.clipPath = next;
      });
    }

    for (const [i, el] of (refs.cards.current ?? []).entries()) {
      if (!el) continue;
      const next = snapshot.target[i] === OPEN_CLIP ? "1" : "0.5";
      applied.set(el, next);
      suppress(el, () => {
        el.style.opacity = next;
      });
    }

    const counter = refs.counter?.current;
    if (counter && snapshot.active >= 0) {
      suppress(counter, () => {
        counter.style.setProperty(
          "--counter-index",
          String(snapshot.active + 1),
        );
      });
    }

    const nameEl = refs.activeName?.current;
    const meta = refs.meta?.[snapshot.active];
    if (nameEl && meta) {
      nameEl.textContent = meta.label;
      nameEl.style.setProperty("--active-tribe-color", meta.color);
    }
    lastSnapshot = snapshot;
  };

  settle();
  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", onScroll, { passive: true });

  return {
    destroy() {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (raf) cancelAnimationFrame(raf);
      if (pending) clearTimeout(pending.timer);
    },
  };
}
