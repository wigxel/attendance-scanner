"use client";
import { useMutation, useQuery } from "convex/react";
import { useState } from "react";
import { toast } from "sonner";
import { KpiPerformance } from "@/components/kpi-performance";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { SegmentProgressBar } from "@/components/ui/segment-gradient-progress";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { getErrorMessage } from "@/lib/error.helpers";
import { cn } from "@/lib/utils";

type Kpi = {
  _id: Id<"kpis">;
  title: string;
  description?: string;
  cadence: "daily" | "weekly" | "monthly";
  audience: "day" | "night" | "all";
  points: number;
  windowStart?: string;
  windowEnd?: string;
  windowOpen: boolean;
  completed: boolean;
  undoable: boolean;
};

const CADENCES = [
  { key: "daily", label: "Daily" },
  { key: "weekly", label: "Weekly" },
  { key: "monthly", label: "Monthly" },
] as const;

const AUDIENCES = [
  { key: "day", label: "Day" },
  { key: "night", label: "Night" },
  { key: "all", label: "All" },
] as const;

type Audience = (typeof AUDIENCES)[number]["key"];

// Day shift hands over at 18:00 Lagos; night is the default from then on.
const DAY_NIGHT_CUTOFF = "18:00";

function lagosHhmm(now: number) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Africa/Lagos",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(new Date(now));
  const get = (type: string) => parts.find((p) => p.type === type)?.value;
  return `${get("hour")}:${get("minute")}`;
}

function defaultAudience(): Audience {
  return lagosHhmm(Date.now()) < DAY_NIGHT_CUTOFF ? "day" : "night";
}

function windowLabel(kpi: Kpi) {
  if (!kpi.windowStart && !kpi.windowEnd) return null;
  return `${kpi.windowStart ?? "00:00"} – ${kpi.windowEnd ?? "23:59"}`;
}

type KpiRowProps = { kpi: Kpi };

function KpiRow({ kpi }: KpiRowProps) {
  const toggle = useMutation(api.kpis.toggleCheck);

  const handleChange = async () => {
    try {
      await toggle({ kpiId: kpi._id });
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  const disabled = kpi.completed ? !kpi.undoable : !kpi.windowOpen;
  const window = windowLabel(kpi);

  return (
    <label
      htmlFor={`kpi-check-${kpi._id}`}
      className={cn(
        "flex items-center gap-3 rounded-lg border p-3",
        kpi.completed && "bg-muted/50",
      )}
    >
      <Checkbox
        id={`kpi-check-${kpi._id}`}
        checked={kpi.completed}
        disabled={disabled}
        onCheckedChange={handleChange}
      />
      <span className="flex-1">
        <span
          className={cn(
            "block text-sm font-medium",
            kpi.completed && "line-through text-muted-foreground",
          )}
        >
          {kpi.title}
        </span>
        {kpi.description && (
          <span className="block text-xs text-muted-foreground">
            {kpi.description}
          </span>
        )}
        {window && (
          <span className="block text-xs text-muted-foreground">
            <span className="font-mono tabular-nums">{window}</span>
            {!kpi.windowOpen && !kpi.completed && (
              <Badge variant="outline" className="ml-2">
                Closed
              </Badge>
            )}
            {kpi.completed && !kpi.undoable && (
              <Badge variant="outline" className="ml-2">
                Locked
              </Badge>
            )}
          </span>
        )}
      </span>
      <Badge variant={kpi.completed ? "default" : "secondary"}>
        {kpi.points} pts
      </Badge>
    </label>
  );
}

export default function KpisPage() {
  const kpis = useQuery(api.kpis.myChecklist, {});
  const [audience, setAudience] = useState<Audience>(defaultAudience);

  if (kpis === undefined) {
    return (
      <div className="w-full p-6 md:p-8 flex flex-col gap-8">
        <div>
          <Skeleton className="h-9 w-24" />
          <Skeleton className="mt-2 h-4 w-64" />
        </div>
        <Skeleton className="h-32 w-full" />
        <div className="flex flex-col gap-2">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  const visible =
    audience === "all"
      ? kpis
      : kpis.filter((t) => t.audience === "all" || t.audience === audience);
  const earned = visible
    .filter((t) => t.completed)
    .reduce((s, t) => s + t.points, 0);
  const possible = visible.reduce((s, t) => s + t.points, 0);
  const pct = possible > 0 ? (earned / possible) * 100 : 0;
  const doneCount = visible.filter((t) => t.completed).length;

  return (
    <div className="w-full p-6 md:p-8 flex flex-col gap-8">
      <header>
        <h1 className="text-3xl font-bold">KPIs</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Check off KPIs in their open window to earn points.
        </p>
      </header>

      <div className="flex flex-col gap-8 lg:grid lg:grid-cols-[1fr_380px] lg:items-start">
        <div className="flex min-w-0 flex-col gap-8 lg:col-start-1">
          <section aria-label="Progress">
            <p className="text-xs text-muted-foreground">This shift</p>
            <p className="mt-1 font-heading text-6xl font-bold tabular-nums">
              {earned}
              <span className="ml-2 align-middle font-sans text-lg font-normal text-muted-foreground">
                / {possible} pts
              </span>
            </p>
            <div className="mt-3">
              <SegmentProgressBar progressValue={pct} />
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              {pct.toFixed(0)}% complete, {doneCount} of {visible.length} done
            </p>
          </section>

          <section aria-label="Performance">
            <KpiPerformance />
          </section>
        </div>

        <section
          aria-label="Checklist"
          className="min-w-0 lg:col-start-2 lg:row-start-1 lg:row-end-[-1] lg:self-stretch"
        >
          <Card className="h-full">
            <CardHeader>
              <div className="flex items-center justify-between gap-2">
                <CardTitle>Checklist</CardTitle>
                <fieldset className="flex gap-2">
                  <legend className="sr-only">Shift</legend>
                  {AUDIENCES.map((a) => (
                    <Button
                      key={a.key}
                      size="sm"
                      variant={audience === a.key ? "default" : "outline"}
                      onClick={() => setAudience(a.key)}
                    >
                      {a.label}
                    </Button>
                  ))}
                </fieldset>
              </div>
            </CardHeader>
            <CardContent>
              {visible.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No KPIs for this shift yet. Try another shift, or ask your
                  administrator to add some.
                </p>
              ) : (
                <div className="flex flex-col gap-6">
                  {CADENCES.map((c) => {
                    const items = visible.filter((t) => t.cadence === c.key);
                    const done = items.filter((t) => t.completed).length;
                    return (
                      <div key={c.key}>
                        <div className="mb-2 flex items-baseline gap-2">
                          <h2 className="text-sm font-semibold">{c.label}</h2>
                          <span className="font-mono text-xs tabular-nums text-muted-foreground">
                            {done}/{items.length}
                          </span>
                        </div>
                        {items.length === 0 ? (
                          <p className="py-2 text-sm text-muted-foreground">
                            Nothing here. Try another shift.
                          </p>
                        ) : (
                          <div className="flex flex-col gap-2">
                            {items.map((t) => (
                              <KpiRow key={t._id} kpi={t as Kpi} />
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </section>
      </div>
    </div>
  );
}
