"use client";

import { useQuery } from "convex/react";
import { useEffect, useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/convex/_generated/api";
import { cn } from "@/lib/utils";

// Missed buckets for 15 minutes means the feed is stale.
const STALE_MS = 15 * 60 * 1000;
const TICK_MS = 30 * 1000;

function useTickingNow(intervalMs: number) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}

function formatLagos(ms: number) {
  return new Intl.DateTimeFormat("en-NG", {
    timeZone: "Africa/Lagos",
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(new Date(ms));
}

function relativeAge(ms: number, now: number) {
  const min = Math.floor((now - ms) / 60000);
  if (min < 1) return "now";
  if (min < 60) return `${min} min ago`;
  const hours = Math.floor(min / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export function LastUpdated() {
  const last = useQuery(api.roomMetrics.lastReading, {});
  const now = useTickingNow(TICK_MS);

  if (last === undefined) {
    return <Skeleton className="h-5 w-40" />;
  }

  if (last.timestamp === null) {
    return <p className="text-sm text-muted-foreground">No data yet</p>;
  }

  const isStale = now - last.timestamp >= STALE_MS;

  return (
    <p className="flex items-center gap-2 text-xs text-muted-foreground">
      <span className="flex flex-col gap-1 text-end">
        <span className="flex text-foreground items-center gap-2">
          <span
            aria-hidden
            className={cn(
              "inline-block h-2 w-2 rounded-full",
              isStale ? "bg-amber-500" : "bg-emerald-500",
            )}
          />

          Last update: {formatLagos(last.timestamp)}{" "}
        </span>
        <span className="ml-1 text-xs">
          ({relativeAge(last.timestamp, now)}
          {isStale ? ", stale" : ""})
        </span>
      </span>
    </p>
  );
}
