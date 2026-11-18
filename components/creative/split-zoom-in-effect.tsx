"use client";

import {
  Children,
  type CSSProperties,
  type ReactNode,
  useEffect,
  useRef,
} from "react";
import { cn } from "@/lib/utils";
import { mountShutters } from "./shutter-controller";

type SplitZoomInEffectProps = {
  className?: string;
  children: ReactNode;
  /** Stretch over the nearest positioned ancestor, like next/image fill. */
  fill?: boolean;
  /** Custom properties like {"--shutter-color": "white"} ride along to the bars. */
  style?: CSSProperties & {
    "--shutter-color"?: string;
    /** Shutter slice height, e.g. "250px"; fallback 300px. */
    "--shutter-height"?: string;
  };
};

export function SplitZoomInEffect({
  children,
  fill,
  style,
  className,
}: SplitZoomInEffectProps) {
  if (Children.toArray(children).length > 1) {
    throw new Error("SplitZoomInEffect wraps exactly one child.");
  }

  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const controls = mountShutters(ref.current, {
      durationMs: 1000,
    });
    // The reveal runs as soon as the shutters are in place.
    controls.start();
    return controls.teardown;
  }, []);

  return (
    <div
      ref={ref}
      className={cn("relative", className, fill ? "absolute inset-0" : "w-fit")}
      style={style}
    >
      {children}
      {/* Painted over the image until the shutters take over. */}
      <div
        data-shutter-cover
        className="absolute inset-0"
        style={{ backgroundColor: "var(--shutter-color, var(--primary))" }}
      />
    </div>
  );
}
