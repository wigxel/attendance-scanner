import { animate } from "motion/react";
import type { RefObject } from "react";

// Calibration knobs: minimum time between spotlight wipes (throttle), the
// boundary line's offset from the spotlight frame's top edge, and the height
// of the activation band below it. A card is active while its box overlaps
// the band. Tweak while SPOTLIGHT_DEBUG shows the band, then leave alone.
export const SPOTLIGHT_THROTTLE_MS = 250;
export const SPOTLIGHT_BOUNDARY_OFFSET_PX = 0;
export const SPOTLIGHT_BOUNDARY_RANGE_PX = 200;

// Scroll snap: after scrolling settles (SPOTLIGHT_SETTLE_MS of quiet), the
// active card glides to the band's top edge. Skipped for tiny deltas; a
// snap can't be triggered by resize, only by real scrolling.
export const SPOTLIGHT_SETTLE_MS = 150;
export const SPOTLIGHT_SNAP_DURATION_S = 0.35;
const SPOTLIGHT_SNAP_MIN_PX = 8;

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
const ACTIVE_OPACITY = "1";
const INACTIVE_OPACITY = "0.5";

export function clipFor(index: number, activeIdx: number) {
  return index < activeIdx ? WIPED_CLIP : OPEN_CLIP;
}

type Snapshot = { target: string[]; active: number };

type SpotlightRefs = {
  clips: RefObject<(HTMLDivElement | null)[]>;
  cards: RefObject<(HTMLDivElement | null)[]>;
  frame: RefObject<HTMLDivElement | null>;
  debugLine: RefObject<HTMLDivElement | null>;
  counter?: RefObject<HTMLDivElement | null>;
  activeName?: RefObject<HTMLDivElement | null>;
  meta?: ReadonlyArray<{ label: string; color: string }>;
  count: number;
  debug: boolean;
};

/**
 * Owns the spotlight's activation imperatively: a scroll + rAF loop computes
 * the boundary band (anchored to the spotlight frame's live top edge), finds
 * the card straddling it, and writes clip paths + opacities straight to the
 * DOM — diff-based, so transitions never restart. Nothing here re-renders
 * React.
 */
export function createSpotlightController(refs: SpotlightRefs) {
  let lastFire = 0;
  let raf = 0;
  let lastFrameHeight = 0;
  let settleTimer: ReturnType<typeof setTimeout> | null = null;
  let snapControls: { stop: () => void } | null = null;
  let snapping = false;
  let pending: {
    timer: ReturnType<typeof setTimeout>;
    snapshot: Snapshot;
  } | null = null;
  let lastSnapshot: Snapshot = { target: [], active: 0 };

  // Element → last written value; the diff gate that keeps CSS transitions
  // from restarting.
  const applied = new Map<HTMLElement, string>();

  const suppress = (el: HTMLElement, mutate: () => void) => {
    const prevTransition = el.style.transition;
    el.style.transition = "none";
    mutate();
    void el.offsetHeight;
    el.style.transition = prevTransition;
  };

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

  // The last leader box is at least as tall as the spotlight frame, so its
  // box still straddles the activation band at page end — the section can
  // never end on an empty pile.
  const syncLastLeaderBox = () => {
    const frame = refs.frame.current;
    const last = (refs.cards.current ?? [])[refs.count - 1];
    if (!frame || !last) return;
    const height = frame.offsetHeight;
    if (height === lastFrameHeight) return;
    lastFrameHeight = height;
    last.style.minHeight = `${height}px`;
  };

  // Target clip per card: box below the band = wiped down (hidden); box
  // above the band = wiped up (passed); box overlapping the band = open (the
  // active one). Several cards can overlap the band on short viewports — the
  // topmost straddler wins.
  const computeTarget = (): Snapshot => {
    const line = computeLine();
    paintDebug(line);
    const bandEnd = line + SPOTLIGHT_BOUNDARY_RANGE_PX;

    const cards = refs.cards.current ?? [];
    const target: string[] = [];
    let straddler = -1;

    for (let i = 0; i < cards.length; i++) {
      const card = cards[i];
      if (!card) {
        target[i] = OPEN_CLIP;
        continue;
      }
      const rect = card.getBoundingClientRect();
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

  // Writes the snapshot straight to the DOM. `instant` suppresses
  // transitions, so first paint settles without animating from SSR defaults.
  const applySnapshot = (snapshot: Snapshot, instant = false) => {
    const paint = (el: HTMLElement, value: string, mutate: () => void) => {
      if (applied.get(el) === value) return;
      applied.set(el, value);
      if (instant) {
        suppress(el, mutate);
        return;
      }
      mutate();
    };

    const clips = refs.clips.current ?? [];
    for (let i = 0; i < clips.length; i++) {
      const el = clips[i];
      if (!el) continue;
      const clip = snapshot.target[i] ?? OPEN_CLIP;
      paint(el, clip, () => {
        el.style.clipPath = clip;
        el.setAttribute("aria-hidden", String(clip !== OPEN_CLIP));
      });
    }

    // Inactive leader boxes dim to half opacity; the active one is full.
    const cards = refs.cards.current ?? [];
    for (let i = 0; i < cards.length; i++) {
      const el = cards[i];
      if (!el) continue;
      const opacity =
        snapshot.target[i] === OPEN_CLIP ? ACTIVE_OPACITY : INACTIVE_OPACITY;
      paint(el, opacity, () => {
        el.style.opacity = opacity;
      });
    }

    if (snapshot.active < 0) {
      lastSnapshot = snapshot;
      return;
    }

    // The rolling index counter rides on the active card (1-based display);
    // CSS derives the offset from --counter-index and the inherited
    // font-size.
    const index = String(snapshot.active + 1);
    const counter = refs.counter?.current;
    if (counter) {
      paint(counter, index, () => {
        counter.style.setProperty("--counter-index", index);
      });
    }

    // The active tribe name + its colour, written straight to the shell.
    const nameEl = refs.activeName?.current;
    const meta = refs.meta?.[snapshot.active];
    if (nameEl && meta) {
      const value = `${meta.label} ${meta.color}`;
      paint(nameEl, value, () => {
        nameEl.textContent = meta.label;
        nameEl.style.setProperty("--active-tribe-color", meta.color);
      });
    }
    lastSnapshot = snapshot;
  };

  const sameClips = (a: string[], b: string[]) =>
    a.length === b.length && a.every((clip, i) => clip === b[i]);

  const sameSnapshot = (a: Snapshot, b: Snapshot) =>
    sameClips(a.target, b.target) && a.active === b.active;

  // The controller only owns the page while the leader list overlaps the
  // viewport. Outside it — sections above or below — nothing may run, most
  // importantly the snap: settling in the footer must never glide the page
  // back up to the leaders.
  const inScope = () => {
    const cards = refs.cards.current ?? [];
    const first = cards[0]?.getBoundingClientRect();
    const last = cards[refs.count - 1]?.getBoundingClientRect();
    if (!first || !last) return false;
    return last.bottom >= 0 && first.top <= window.innerHeight;
  };

  const frameTick = () => {
    if (!inScope()) {
      if (settleTimer) {
        clearTimeout(settleTimer);
        settleTimer = null;
      }
      return;
    }

    // Every in-scope scroll frame pushes the settle moment out; the snap
    // only fires once scrolling has actually stopped.
    scheduleSettle();
    syncLastLeaderBox();
    const snapshot = computeTarget();
    if (sameSnapshot(snapshot, lastSnapshot)) return;

    // A wipe is already queued for this window; it fires with the latest
    // snapshot when the window ends.
    if (pending) {
      pending.snapshot = snapshot;
      return;
    }

    const elapsed = Date.now() - lastFire;
    if (elapsed >= SPOTLIGHT_THROTTLE_MS) {
      lastFire = Date.now();
      applySnapshot(snapshot);
      return;
    }

    const timer = setTimeout(() => {
      const held = pending;
      pending = null;
      if (held) {
        lastFire = Date.now();
        applySnapshot(held.snapshot);
      }
    }, SPOTLIGHT_THROTTLE_MS - elapsed);
    pending = { timer, snapshot };
  };

  // Scroll snap: once scrolling settles, glide the active (or nearest) card
  // so its top edge sits on the band's top edge. Visuals keep updating while
  // the glide runs; only further snaps are suppressed, and any user input
  // cancels it immediately.
  const snapToActive = () => {
    if (snapping || !inScope()) return;
    const { active } = computeTarget();
    const cards = refs.cards.current ?? [];

    // Band in a gap: the nearest card takes the glide so the pile is never
    // left empty at a resting position.
    let index = active;
    if (index === -1) {
      const line = computeLine();
      let bestDistance = Number.POSITIVE_INFINITY;
      for (let i = 0; i < cards.length; i++) {
        const card = cards[i];
        if (!card) continue;
        const distance = Math.abs(card.getBoundingClientRect().top - line);
        if (distance < bestDistance) {
          bestDistance = distance;
          index = i;
        }
      }
    }

    const card = index === -1 ? undefined : cards[index];
    if (!card) return;

    const line = computeLine();
    const delta = card.getBoundingClientRect().top - line;
    if (Math.abs(delta) < SPOTLIGHT_SNAP_MIN_PX) return;

    const maxScroll = Math.max(
      0,
      document.documentElement.scrollHeight - window.innerHeight,
    );
    const from = window.scrollY;
    const to = Math.min(Math.max(from + delta, 0), maxScroll);
    if (to === from) return;

    snapping = true;
    snapControls = animate(from, to, {
      duration: SPOTLIGHT_SNAP_DURATION_S,
      ease: "easeOut",
      onUpdate: (value) => window.scrollTo(0, value),
      onComplete: () => {
        snapping = false;
        snapControls = null;
      },
    });
  };

  const scheduleSettle = () => {
    // Only real scrolling may end in a snap; resize-triggered recomputes
    // never yank the page.
    if (snapping) return;
    if (settleTimer) clearTimeout(settleTimer);
    settleTimer = setTimeout(snapToActive, SPOTLIGHT_SETTLE_MS);
  };

  // Ours and the user's scrolls are indistinguishable on the scroll event,
  // so input cancellation listens to the event types only a human emits.
  const SCROLL_KEYS = new Set([
    "ArrowUp",
    "ArrowDown",
    "PageUp",
    "PageDown",
    "Home",
    "End",
    " ",
  ]);

  const cancelSnap = (event: Event) => {
    if (!snapping) return;
    if (
      event.type === "keydown" &&
      !(event instanceof KeyboardEvent && SCROLL_KEYS.has(event.key))
    ) {
      return;
    }
    snapControls?.stop();
    snapping = false;
    snapControls = null;
  };

  const onScroll = () => {
    if (raf) return;
    raf = requestAnimationFrame(() => {
      raf = 0;
      frameTick();
    });
  };

  const onResize = () => {
    if (raf) return;
    raf = requestAnimationFrame(() => {
      raf = 0;
      frameTick();
    });
  };

  syncLastLeaderBox();
  applySnapshot(computeTarget(), true);

  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", onResize, { passive: true });
  window.addEventListener("wheel", cancelSnap, { passive: true });
  window.addEventListener("touchstart", cancelSnap, { passive: true });
  window.addEventListener("keydown", cancelSnap);

  return {
    destroy() {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("wheel", cancelSnap);
      window.removeEventListener("touchstart", cancelSnap);
      window.removeEventListener("keydown", cancelSnap);
      if (raf) cancelAnimationFrame(raf);
      if (pending) clearTimeout(pending.timer);
      if (settleTimer) clearTimeout(settleTimer);
      snapControls?.stop();
    },
  };
}
