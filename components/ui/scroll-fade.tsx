"use client";

import * as React from "react";
import { edgeOpacities } from "@/lib/scroll.helpers";
import { cn } from "@/lib/utils";

type ScrollFadeProps = {
  targetRef: React.RefObject<HTMLElement | null>;
  /** Width of each fade. */
  edgeSize?: string;
  /** Portion of the viewport over which the fade ramps to zero. */
  edgeRatio?: number;
  /** Gradient start colour, e.g. "from-(--background-lv1)". */
  fadeClassName?: string;
  className?: string;
};

/**
 * Edge fades for a horizontal scroll container. Parent must be `relative`.
 * The right fade disappears as you reach the end; the left fade appears as
 * you move away from the start.
 */
export function ScrollFade({
  targetRef,
  edgeSize = "2rem",
  edgeRatio = 0.2,
  fadeClassName = "from-(--background-lv1)",
  className,
}: ScrollFadeProps) {
  const [edges, setEdges] = React.useState({ left: 0, right: 0 });

  React.useEffect(() => {
    const target = targetRef.current;
    if (!target) return;

    let frame: number | null = null;

    const measure = () => {
      setEdges(
        edgeOpacities({
          scrollLeft: target.scrollLeft,
          clientWidth: target.clientWidth,
          scrollWidth: target.scrollWidth,
          edgeRatio,
        }),
      );
    };

    const schedule = () => {
      if (frame !== null) return;
      frame = requestAnimationFrame(() => {
        frame = null;
        measure();
      });
    };

    measure();
    target.addEventListener("scroll", schedule, { passive: true });

    const observer = new ResizeObserver(schedule);
    observer.observe(target);
    if (target.firstElementChild) observer.observe(target.firstElementChild);

    return () => {
      if (frame !== null) cancelAnimationFrame(frame);
      target.removeEventListener("scroll", schedule);
      observer.disconnect();
    };
  }, [targetRef, edgeRatio]);

  return (
    <>
      <div
        aria-hidden
        className={cn(
          "pointer-events-none absolute inset-y-0 left-0 bg-gradient-to-r to-transparent transition-opacity duration-150",
          fadeClassName,
          className,
        )}
        style={{ width: edgeSize, opacity: edges.left }}
      />
      <div
        aria-hidden
        className={cn(
          "pointer-events-none absolute inset-y-0 right-0 bg-gradient-to-l to-transparent transition-opacity duration-150",
          fadeClassName,
          className,
        )}
        style={{ width: edgeSize, opacity: edges.right }}
      />
    </>
  );
}
