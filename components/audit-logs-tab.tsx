"use client";

import { useQuery } from "convex/react";
import { format } from "date-fns";
import { ChevronDown, ScrollText, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { api } from "@/convex/_generated/api";
import type { Doc } from "@/convex/_generated/dataModel";
import { currencyFormatter } from "@/lib/currency.helpers";
import { cn } from "@/lib/utils";
import {
  EmptyState,
  EmptyStateConceal,
  EmptyStateContent,
  EmptyStateDescription,
  EmptyStateTitle,
} from "./empty-state";
import { Skeleton } from "./ui/skeleton";

type AuditLogEntry = Doc<"auditLog"> & {
  actor: Doc<"profile"> | null;
  owner: Doc<"profile"> | null;
};

function DetailsPreview({ metadata }: { metadata: string | undefined }) {
  let parsed: Record<string, unknown> | null = null;
  try {
    parsed = metadata ? JSON.parse(metadata) : null;
  } catch {
    parsed = null;
  }

  if (!parsed) return null;

  const parts: string[] = [];

  if (parsed.amount !== undefined) {
    const amount =
      typeof parsed.amount === "number"
        ? currencyFormatter.format(parsed.amount / 100)
        : String(parsed.amount);
    parts.push(amount);
  }

  if (parsed.seatIds !== undefined) {
    const count = Array.isArray(parsed.seatIds) ? parsed.seatIds.length : 1;
    parts.push(`${count} seat${count !== 1 ? "s" : ""}`);
  }

  if (parsed.duration !== undefined) {
    parts.push(`${parsed.duration} ${parsed.durationType ?? "days"}`);
  }

  if (parts.length === 0) return null;

  return (
    <span className="inline-flex items-center gap-1 text-sm text-muted-foreground truncate">
      {parts.map((part, i) => (
        <span key={i}>
          {i > 0 && <span className="mx-0.5 text-muted-foreground/40">·</span>}
          {part}
        </span>
      ))}
    </span>
  );
}

function MetadataCard({
  metadata,
  owner,
}: {
  metadata: string | undefined;
  owner: AuditLogEntry["owner"];
}) {
  let parsed: Record<string, unknown> | null = null;
  try {
    parsed = metadata ? JSON.parse(metadata) : null;
  } catch {
    parsed = null;
  }

  if (!parsed) return null;

  const fields: { label: string; value: string }[] = [];

  if (parsed.amount !== undefined) {
    const amount =
      typeof parsed.amount === "number"
        ? currencyFormatter.format(parsed.amount / 100)
        : String(parsed.amount);
    fields.push({ label: "Amount", value: amount });
  }

  if (parsed.duration !== undefined) {
    fields.push({
      label: "Duration",
      value: `${parsed.duration} ${parsed.durationType ?? "days"}`,
    });
  }

  if (parsed.durationType !== undefined && parsed.duration === undefined) {
    fields.push({ label: "Duration Type", value: String(parsed.durationType) });
  }

  if (parsed.seatIds !== undefined) {
    const seatCount = Array.isArray(parsed.seatIds) ? parsed.seatIds.length : 1;
    fields.push({ label: "Seats", value: String(seatCount) });
  }

  if (parsed.ticketCount !== undefined) {
    fields.push({ label: "Ticket Count", value: String(parsed.ticketCount) });
  }

  if (parsed.ownerUserId !== undefined) {
    const ownerName = owner
      ? `${owner.firstName} ${owner.lastName}`
      : String(parsed.ownerUserId);
    fields.push({ label: "Owner", value: ownerName });
  }

  if (parsed.status !== undefined) {
    fields.push({
      label: "Previous Status",
      value: String(parsed.status),
    });
  }

  return (
    <div className="py-2">
      <p className="text-xs font-semibold text-muted-foreground mb-2">
        Booking Details
      </p>
      <div className="grid grid-cols-2 gap-x-6 gap-y-1.5">
        {fields.map((f) => (
          <div key={f.label} className="flex items-center gap-2 text-sm">
            <span className="text-muted-foreground">{f.label}:</span>
            <span className="font-medium">{f.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function AuditLogsTab() {
  const data = useQuery(api.audit.list);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const handleToggle = (id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  const filtered = useMemo(() => {
    if (!data) return [];
    if (!search.trim()) return data;

    const q = search.toLowerCase();
    return data.filter((entry) => {
      const actionMatch = entry.action.toLowerCase().includes(q);
      const actorName = entry.actor
        ? `${entry.actor.firstName} ${entry.actor.lastName}`.toLowerCase()
        : "";
      const actorMatch = actorName.includes(q);
      const idMatch = entry._id.toLowerCase().includes(q);
      return actionMatch || actorMatch || idMatch;
    });
  }, [data, search]);

  if (!data) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-full" />
        <div className="rounded-md border">
          <div
            className="grid gap-0"
            style={{ gridTemplateColumns: "1fr minmax(150px, 1fr) 1fr 1.5fr" }}
          >
            <Skeleton className="h-10" />
            <Skeleton className="h-10" />
            <Skeleton className="h-10" />
            <Skeleton className="h-10" />
          </div>
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-14 w-full" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search audit logs..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      <EmptyState isEmpty={filtered.length === 0}>
        <EmptyStateContent>
          <ScrollText className="h-12 w-12 text-muted-foreground" />
          <EmptyStateTitle>No audit logs found</EmptyStateTitle>
          <EmptyStateDescription>
            {search
              ? "Try a different search term."
              : "Audit logs will appear here when actions like booking deletions are performed."}
          </EmptyStateDescription>
        </EmptyStateContent>

        <EmptyStateConceal>
          <div className="rounded-md border">
            <div
              className="grid gap-0"
              style={{
                gridTemplateColumns: "1fr minmax(150px, 1fr) 1fr 1.5fr",
              }}
            >
              <div className="px-4 py-2 text-xs font-medium text-muted-foreground border-b">
                Time
              </div>
              <div className="px-4 py-2 text-xs font-medium text-muted-foreground border-b">
                Action
              </div>
              <div className="px-4 py-2 text-xs font-medium text-muted-foreground border-b">
                Actor
              </div>
              <div className="px-4 py-2 text-xs font-medium text-muted-foreground border-b">
                Details
              </div>
            </div>

            {filtered.map((entry) => {
              const isExpanded = expandedId === entry._id;
              return (
                <div
                  key={entry._id}
                  className="grid gap-0"
                  style={{
                    gridTemplateColumns: "1fr minmax(150px, 1fr) 1fr 1.5fr",
                  }}
                >
                  <button
                    type="button"
                    onClick={() => handleToggle(entry._id)}
                    className={cn(
                      "flex items-center gap-2 px-4 py-3 text-sm text-left border-b hover:bg-muted/50 transition-colors",
                      isExpanded && "bg-muted/30",
                    )}
                  >
                    <ChevronDown
                      className={cn(
                        "h-3.5 w-3.5 text-muted-foreground shrink-0 transition-transform",
                        !isExpanded && "-rotate-90",
                      )}
                    />
                    <span className="font-mono text-sm text-black">
                      {format(entry.timestamp, "MMM dd HH:mm")}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleToggle(entry._id)}
                    className={cn(
                      "flex items-center px-4 py-3 text-sm border-b hover:bg-muted/50 transition-colors",
                      isExpanded && "bg-muted/30",
                    )}
                  >
                    <span className="font-mono text-sm text-black">
                      {entry.action}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleToggle(entry._id)}
                    className={cn(
                      "flex items-center px-4 py-3 text-sm border-b hover:bg-muted/50 transition-colors",
                      isExpanded && "bg-muted/30",
                    )}
                  >
                    {entry.actor
                      ? `${entry.actor.firstName} ${entry.actor.lastName}`
                      : "—"}
                  </button>

                  <button
                    type="button"
                    onClick={() => handleToggle(entry._id)}
                    className={cn(
                      "flex items-center px-4 py-3 text-sm border-b hover:bg-muted/50 transition-colors",
                      isExpanded && "bg-muted/30",
                    )}
                  >
                    <DetailsPreview metadata={entry.metadata} />
                  </button>

                  {isExpanded && (
                    <div className="col-span-4 px-4 pb-4 border-b bg-muted/20">
                      <MetadataCard
                        metadata={entry.metadata}
                        owner={entry.owner}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </EmptyStateConceal>
      </EmptyState>
    </div>
  );
}
