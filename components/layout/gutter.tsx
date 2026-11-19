"use client";

import { range } from "effect/Array";
import React from "react";

type GutterBreakpoint = {
  type: "stretch";
  columns: number;
  gutter: number;
  margin: number;
  maxWidth: number;
};

const DEFAULT_BREAKPOINTS: GutterBreakpoint[] = [
  { type: "stretch", columns: 12, gutter: 20, margin: 0, maxWidth: 1536 },
];

/**
 * Layout wrappers the overlay should match, most specific first. The first one
 * on the page wins; the width is read from it, not from `maxWidth`.
 */
const DEFAULT_CONSTRAINTS = [".container", ".section"];

export type GutterProps = {
  breakpoints?: GutterBreakpoint[];
  constraints?: string[];
};

function findConstraintElement(constraints: string[]) {
  for (const selector of constraints) {
    const element = document.querySelector<HTMLElement>(selector);
    if (element && element.getBoundingClientRect().width > 0) return element;
  }

  return null;
}

/** The width inside the element's horizontal padding, where the grid sits. */
function contentWidth(element: HTMLElement) {
  const style = window.getComputedStyle(element);
  const padding =
    parseFloat(style.paddingLeft) + parseFloat(style.paddingRight);

  return Math.round(element.getBoundingClientRect().width - padding);
}

export function Gutter({
  breakpoints = DEFAULT_BREAKPOINTS,
  constraints = DEFAULT_CONSTRAINTS,
}: GutterProps) {
  const [showGutter, setShowGutter] = React.useState(false);
  const overlayRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.shiftKey && event.key === "G") {
        setShowGutter((prev) => !prev);
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  // Measure every time the overlay opens, then keep up with the constraint
  // element as it resizes. Writing the width straight to the node keeps the
  // column count out of React's render path; with no constraint the CSS
  // fallback leaves the configured maxWidth in charge.
  React.useEffect(() => {
    if (!showGutter) return;

    const element = findConstraintElement(constraints);
    if (!element) return;

    const applyWidth = () => {
      const width = contentWidth(element);
      overlayRef.current?.style.setProperty("--gutter-width", `${width}px`);
    };

    applyWidth();

    const observer = new ResizeObserver(applyWidth);
    observer.observe(element);

    return () => observer.disconnect();
  }, [showGutter, constraints]);

  if (!showGutter) {
    return null;
  }

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0"
      style={
        {
          pointerEvents: "none",
          "--column-fill": "hsl(0deg 100% 58.16% / 22%)",
        } as React.CSSProperties
      }
    >
      {breakpoints.map((breakpoint) => {
        const columns = range(1, breakpoint.columns);

        return (
          <div
            key={`${breakpoint.type}-${breakpoint.columns}-${breakpoint.gutter}-${breakpoint.margin}-${breakpoint.maxWidth}`}
            className="mx-auto flex size-full justify-center"
          >
            <div
              className="flex size-full"
              style={{
                gap: `${breakpoint.gutter}px`,
                maxWidth: `var(--gutter-width, ${breakpoint.maxWidth}px)`,
                margin: `0 ${breakpoint.margin}px`,
              }}
            >
              {columns.map((index) => {
                return (
                  <div key={index} className="flex-1 bg-(--column-fill)" />
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
