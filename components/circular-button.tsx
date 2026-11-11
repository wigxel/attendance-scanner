import Image from "next/image";
import type { ComponentPropsWithoutRef } from "react";
import { cn } from "@/lib/utils";

const RADIUS = 40; // in viewBox units, out of 100
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
const ARC_SHARE = 0.35; // the label runs along this much of the circle
const ARC_LENGTH = CIRCUMFERENCE * ARC_SHARE;
const LABEL_SIZE = 5;

// arc centred on 12 o'clock, running clockwise
function arcPathFor(radius: number, share: number) {
  const half = Math.PI * share; // half the arc, in radians
  const x1 = 50 - radius * Math.sin(half);
  const x2 = 50 + radius * Math.sin(half);
  const y = 50 - radius * Math.cos(half);

  return `M ${x1},${y} A ${radius},${radius} 0 0 1 ${x2},${y}`;
}

function pathIdFor(label: string) {
  const slug = label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return `circle-label-${slug || "default"}`;
}

type CircularButtonProps = ComponentPropsWithoutRef<"button"> & {
  className?: string;
  /** Accessible name, also drawn around the button's edge. */
  text?: string;
  variant?: "default" | "outline";
};

export function CircularButton({
  className,
  text,
  variant = "default",
  ...restProps
}: CircularButtonProps) {
  const pathId = pathIdFor(text ?? "");

  return (
    <button
      type="button"
      aria-label={text}
      className={cn(
        "relative w-[15vw] aspect-square rounded-full flex items-center justify-center",
        {
          "text-white bg-brand-maker": variant === "default",
          "text-brand-maker bg-transparent border-dashed border border-white/50":
            variant === "outline",
        },
        className,
      )}
      {...restProps}
    >
      {variant === "outline" ? (
        <div className="border-2 border-white/50 aspect-square w-8/12 rounded-full border-dashed absolute" />
      ) : null}

      <Image
        src="/images/pixel-arrow.svg"
        width={200}
        alt=""
        height={200}
        className={cn({
          "w-5/12": variant === "default",
          "w-3/12": variant === "outline",
        })}
      />

      {text ? (
        <div>
          <svg
            viewBox="0 0 100 100"
            aria-hidden
            focusable="false"
            className="pointer-events-none absolute inset-0 h-full w-full"
          >
            <defs>
              <path id={pathId} fill="none" d={arcPathFor(RADIUS, ARC_SHARE)} />
            </defs>

            <text
              className="fill-current uppercase"
              fontSize={LABEL_SIZE}
              letterSpacing={0}
            >
              <textPath
                href={`#${pathId}`}
                startOffset="50%"
                textAnchor="middle"
                textLength={ARC_LENGTH}
                lengthAdjust="spacing"
              >
                {text}
              </textPath>
            </text>
          </svg>

          <svg
            viewBox="0 0 100 100"
            aria-hidden
            focusable="false"
            className="pointer-events-none absolute inset-0 h-full w-full rotate-180"
          >
            <defs>
              <path id={pathId} fill="none" d={arcPathFor(RADIUS, ARC_SHARE)} />
            </defs>

            <text
              className="fill-current uppercase"
              fontSize={LABEL_SIZE}
              letterSpacing={0}
            >
              <textPath
                href={`#${pathId}`}
                startOffset="50%"
                textAnchor="middle"
                textLength={ARC_LENGTH}
                lengthAdjust="spacing"
              >
                {text}
              </textPath>
            </text>
          </svg>
        </div>
      ) : null}
    </button>
  );
}
