"use client";
import { useQuery } from "convex/react";
import { format } from "date-fns";
import {
  ArrowLeft,
  CheckCircle2,
  Circle,
  type LucideIcon,
  MinusCircle,
  XCircle,
} from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/convex/_generated/api";
import { cn } from "@/lib/utils";

type Status = "done" | "missed" | "neglected" | "pending";

type LogItem = {
  kind: "preset" | "instance";
  title: string;
  cadence?: "daily" | "weekly" | "monthly";
  points: number;
  status: Status;
  completedAt: number | null;
};

type LogDay = {
  date: string;
  earned: number;
  available: number;
  items: LogItem[];
};

const STATUS_META: Record<
  Status,
  { label: string; icon: LucideIcon; className: string }
> = {
  done: {
    label: "Done",
    icon: CheckCircle2,
    className: "text-emerald-600 dark:text-emerald-400",
  },
  missed: {
    label: "Missed deadline",
    icon: XCircle,
    className: "text-destructive",
  },
  neglected: {
    label: "Neglected",
    icon: MinusCircle,
    className: "text-amber-600 dark:text-amber-400",
  },
  pending: {
    label: "Pending",
    icon: Circle,
    className: "text-muted-foreground",
  },
};

const RANGES = [30, 60, 90] as const;

// Africa/Lagos has no DST, so offsetting now by whole days stays aligned.
function lagosKey(ms: number) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Lagos",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(ms));
}

function lagosTime(ms: number) {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Africa/Lagos",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(ms));
}

type TrendStripProps = { days: LogDay[] };

function TrendStrip({ days }: TrendStripProps) {
  const max = Math.max(1, ...days.map((d) => d.earned));
  return (
    <div className="flex h-16 items-end gap-1">
      {days.map((d) => {
        const tooltip = `${format(d.date, "MMM d")}: ${d.earned} of ${d.available} pts`;
        return (
          <span
            key={d.date}
            role="img"
            title={tooltip}
            aria-label={tooltip}
            className={cn(
              "min-w-1.5 flex-1 rounded-sm",
              d.earned > 0 ? "bg-primary/80" : "border-b border-dashed",
            )}
            style={
              d.earned > 0
                ? { height: `${(d.earned / max) * 100}%` }
                : undefined
            }
          />
        );
      })}
    </div>
  );
}

type ItemRowProps = { item: LogItem };

function ItemRow({ item }: ItemRowProps) {
  const meta = STATUS_META[item.status];
  const Icon = meta.icon;
  const source =
    item.kind === "instance" ? "Instance" : (item.cadence ?? "preset");
  return (
    <div className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm">
      <Icon className={cn("h-4 w-4 shrink-0", meta.className)} aria-hidden />
      <span className="min-w-0 flex-1">
        <span className="block truncate font-medium">{item.title}</span>
        <span className="block text-xs text-muted-foreground">
          {meta.label} · <span className="capitalize">{source}</span>
          {item.completedAt !== null && ` · ${lagosTime(item.completedAt)}`}
        </span>
      </span>
      <Badge variant={item.status === "done" ? "default" : "secondary"}>
        {item.points} pts
      </Badge>
    </div>
  );
}

type DayBlockProps = { day: LogDay };

function DayBlock({ day }: DayBlockProps) {
  return (
    <div className="rounded-lg border p-3">
      <div className="mb-2 flex items-baseline justify-between gap-2">
        <h3 className="text-sm font-semibold">
          {format(day.date, "EEE, MMM d")}
        </h3>
        <span className="font-mono text-xs tabular-nums text-muted-foreground">
          {day.earned} / {day.available} pts
        </span>
      </div>
      {day.items.length === 0 ? (
        <p className="px-2 py-1 text-sm text-muted-foreground">
          No checklist activity recorded this day.
        </p>
      ) : (
        <div className="flex flex-col gap-0.5">
          {day.items.map((item) => (
            <ItemRow
              key={`${item.kind}-${item.title}-${item.completedAt ?? "open"}`}
              item={item}
            />
          ))}
        </div>
      )}
    </div>
  );
}

type StaffLogProps = { userId: string };

function StaffLog({ userId }: StaffLogProps) {
  const [asOf] = useState(() => Date.now());
  const [range, setRange] = useState<(typeof RANGES)[number]>(30);
  const to = lagosKey(asOf);
  const from = lagosKey(asOf - (range - 1) * 86400000);

  const log = useQuery(api.kpis.staffLog, { userId, from, to });
  const profile = useQuery(api.myFunctions.getUserById, { userId });
  const name = profile
    ? `${profile.firstName} ${profile.lastName}`.trim()
    : userId.slice(0, 8);

  if (log === undefined) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  const totalEarned = log.days.reduce((s, d) => s + d.earned, 0);

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-3">
        <Button asChild variant="ghost" size="sm" className="self-start">
          <Link href="/admin/kpis">
            <ArrowLeft aria-hidden /> Back to KPIs
          </Link>
        </Button>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h1 className="text-2xl font-bold">{name}</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {totalEarned} pts earned · last {range} days
            </p>
          </div>
          <fieldset className="flex gap-2">
            <legend className="sr-only">Range</legend>
            {RANGES.map((r) => (
              <Button
                key={r}
                size="sm"
                variant={range === r ? "default" : "outline"}
                onClick={() => setRange(r)}
              >
                {r}d
              </Button>
            ))}
          </fieldset>
        </div>
      </header>

      <section aria-label="Points trend">
        <h2 className="mb-2 text-sm font-semibold">Points per day</h2>
        <TrendStrip days={log.days} />
      </section>

      <section aria-label="Daily log" className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold">Daily log</h2>
        <p className="text-xs text-muted-foreground">
          Item lists are rebuilt from today&apos;s checklist, so items edited
          recently may not match what was live on older days.
        </p>
        {log.days.map((day) => (
          <DayBlock key={day.date} day={day} />
        ))}
      </section>
    </div>
  );
}

export default function StaffKpiLogPage() {
  const params = useParams();
  const staffId = typeof params.staffId === "string" ? params.staffId : "";

  if (!staffId) {
    return (
      <p className="p-6 text-sm text-muted-foreground">No staff selected.</p>
    );
  }

  return (
    <div className="w-full p-6 md:p-8">
      <div className="mx-auto flex max-w-2xl flex-col gap-6">
        <StaffLog userId={staffId} />
      </div>
    </div>
  );
}
