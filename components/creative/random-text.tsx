"use client";

import { gsap } from "gsap";
import { SplitText } from "gsap/SplitText";
import { useInView } from "motion/react";
import React from "react";

gsap.registerPlugin(SplitText);

const RANDOM_CHARS = "#*ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

const JITTER_FRAMES = 32;
/** Seconds between one char starting to churn and the next. */
const JITTER_STEP_SECONDS = 1;
const SCRAMBLE_DURATION = 1.2;
/** Share of the scramble that runs before any char may settle on its real glyph. */
const SCRAMBLE_MIN_LOCK = 0.35;

type RandomTextVariant = "jitter" | "scramble";

export type RandomTextProps = {
  children: React.ReactNode;
  animate?: "in-view";
  variant?: RandomTextVariant;
  /** Scramble only, in seconds. */
  duration?: number;
  viewport?: { once: boolean };
  onComplete?: VoidFunction;
};

function getRandomChar() {
  return RANDOM_CHARS[Math.floor(Math.random() * RANDOM_CHARS.length)];
}

/** Every char churns in place; each locks to its real glyph after `lockAt`. */
function scrambleTimeline(chars: Element[], duration: number) {
  const targets = chars.map((char) => char.textContent ?? "");
  const lockAt = targets.map(
    () =>
      duration * (SCRAMBLE_MIN_LOCK + Math.random() * (1 - SCRAMBLE_MIN_LOCK)),
  );

  const elapsed = { seconds: 0 };
  const timeline = gsap.timeline();

  timeline.to(elapsed, {
    seconds: duration,
    duration,
    ease: "none",
    onUpdate: () => {
      chars.forEach((char, index) => {
        char.textContent =
          elapsed.seconds >= lockAt[index] ? targets[index] : getRandomChar();
      });
    },
  });

  return timeline;
}

/** Chars churn left to right, one second apart, for a fixed number of frames. */
function jitterTimeline(chars: Element[]) {
  const master = gsap.timeline();

  chars.forEach((char, index) => {
    const target = char.textContent ?? "";
    const timeline = gsap.timeline({ delay: index * JITTER_STEP_SECONDS });

    for (let frame = 0; frame < JITTER_FRAMES; frame++) {
      timeline.call(() => {
        char.textContent = getRandomChar();
      });
      timeline.to({}, { duration: 1 / 60 });
    }

    timeline.call(() => {
      char.textContent = target;
    });

    master.add(timeline, "0");
  });

  return master;
}

export function RandomText(props: RandomTextProps) {
  const {
    children: text,
    animate = "in-view",
    variant = "jitter",
    duration = SCRAMBLE_DURATION,
    viewport,
    onComplete,
  } = props;

  const ref = React.useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref);
  const animateCount = React.useRef(0);

  const startAnimation = (el: HTMLElement) => {
    if (viewport?.once && animateCount.current > 0) return;

    animateCount.current += 1;

    // Split only the visible layer; the hidden copy stays whole to hold layout.
    const visibleLayer = (el.firstElementChild ?? el) as HTMLElement;
    const split = SplitText.create(visibleLayer, { type: "chars" });
    const chars = split.chars.filter((char) => char.textContent?.trim());

    const ctx = gsap.context(() => {
      const timeline =
        variant === "scramble"
          ? scrambleTimeline(chars, duration)
          : jitterTimeline(chars);

      timeline.eventCallback("onComplete", () => onComplete?.());
    }, el);

    return () => {
      ctx.revert();
      split.revert();
    };
  };

  React.useEffect(() => {
    if (animate === "in-view" && !isInView) return;

    const el = ref.current;
    if (!el) return;

    return startAnimation(el);
  }, [text, isInView, animate, variant, duration]);

  return (
    <span ref={ref} className="relative">
      <span className="absolute whitespace-nowrap">{text}</span>
      <span className="not-sr-only invisible">{text}</span>
    </span>
  );
}
