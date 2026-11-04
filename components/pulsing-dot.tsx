import { cn } from "@/lib/utils";

type PulsingDotProps = {
  /** true emits an expanding amber ring, false leaves a quiet grey dot. */
  active?: boolean;
};

export function PulsingDot({ active = true }: PulsingDotProps) {
  return (
    <span className="relative flex size-2 shrink-0">
      {active && (
        <span className="absolute inline-flex size-full rounded-full bg-amber-500 opacity-60 motion-safe:animate-ping" />
      )}
      <span
        className={cn(
          "relative inline-flex size-full rounded-full",
          active ? "bg-amber-500" : "bg-muted-foreground/30",
        )}
      />
    </span>
  );
}
