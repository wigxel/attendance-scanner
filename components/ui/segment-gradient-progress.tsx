import { cn } from "@/lib/utils";
import React, { useState, useRef, useLayoutEffect } from "react";

export const SegmentProgressBar = (props: {
  className?: string;
  progressValue?: number;
  gradient?: { startColor: string; endColor: string };
}) => {
  const {
    gradient = {
      startColor: "#ef4444",
      endColor: "#f97316",
    },
    progressValue = 0,
    className,
  } = props;

  const containerRef = useRef<HTMLDivElement>(null);
  const [totalSegments, setTotalSegments] = useState(0);

  useLayoutEffect(() => {
    const updateSegments = () => {
      if (containerRef.current) {
        const width = containerRef.current.offsetWidth;
        // Segment width (3px) + gap (4px, based on 'gap-1') = 7px per segment unit
        const segmentSpace = 7;
        const count = Math.floor(width / segmentSpace);
        setTotalSegments(count);
      }
    };

    updateSegments();
    window.addEventListener("resize", updateSegments);

    return () => window.removeEventListener("resize", updateSegments);
  }, []);

  // Compute active segments dynamically based on the percentage
  const activeSegments = Math.round(
    (Math.max(0, Math.min(100, progressValue)) / 100) * totalSegments,
  );

  return (
    <div ref={containerRef} className="flex gap-1 w-full h-6">
      {Array.from({ length: totalSegments }).map((_, index) => {
        const isActive = index < activeSegments;
        const progressPercent =
          activeSegments > 0 ? (index / activeSegments) * 100 : 0;

        let style = {};
        if (isActive) {
          style = {
            backgroundColor: `color-mix(in srgb, ${gradient.startColor} ${100 - progressPercent}%, ${gradient.endColor} ${progressPercent}%)`,
          };
        }

        return (
          <div
            key={index}
            data-active={isActive}
            className={cn(
              "w-[3px] h-6 group relative overflow-hidden rounded-sm",
              className,
              !isActive && "bg-gray-200",
            )}
          >
            <span
              className={cn(
                "absolute inset-0 transition-all duration-500",
                !isActive && "top-[100%]",
              )}
              style={style}
            />
          </div>
        );
      })}
    </div>
  );
};
