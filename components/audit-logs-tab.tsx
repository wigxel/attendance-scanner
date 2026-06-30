"use client";

import { useQuery } from "convex/react";
import type { FunctionReference } from "convex/server";
import { format } from "date-fns";
import { isNullable } from "effect/Predicate";
import { isEmpty } from "effect/String";
import { ChevronDown, ScrollText, Search } from "lucide-react";
import { useMemo, useState } from "react";
import useEvent from "react-use-event-hook";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { api } from "@/convex/_generated/api";
import type { Doc } from "@/convex/_generated/dataModel";
import { AuditEntry, type AuditEntryField } from "@/lib/audit-entries";
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

function formatFieldPreview(field: AuditEntryField): string {
  switch (field.kind) {
    case "currency":
      return currencyFormatter.format(field.value / 100);
    case "duration":
      return `${field.value} ${field.unit}`;
    case "id":
    case "string":
      return String(field.value);
    case "count":
    case "number":
      return String(field.value);
  }
}

function DetailsPreview({ metadata }: { metadata: string | undefined }) {
  let parsed: Record<string, unknown> | null = null;
  try {
    parsed = metadata ? JSON.parse(metadata) : null;
  } catch {
    parsed = null;
  }

  if (!parsed) return null;

  const { fields } = AuditEntry.parse(parsed);

  if (fields.length === 0) return null;

  const preview = fields.filter((f) => f.preview).slice(0, 3);

  return (
    <span className="inline-flex items-center gap-1 text-sm text-muted-foreground truncate">
      {preview.map((f, i) => (
        <span key={f.label}>
          {i > 0 && <span className="mx-0.5 text-muted-foreground/40">•</span>}
          {formatFieldPreview(f)}
        </span>
      ))}
    </span>
  );
}

function formatFieldValue(field: AuditEntryField): string {
  switch (field.kind) {
    case "currency":
      return currencyFormatter.format(field.value / 100);
    case "duration":
      return `${field.value} ${field.unit}`;
    case "id":
    case "string":
      return String(field.value);
    case "count":
      return `${field.value}`;
    case "number":
      return String(field.value);
  }
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

  const { fields } = AuditEntry.parse(parsed, { owner: owner ?? undefined });

  if (fields.length === 0) return null;

  return (
    <div className="py-2">
      <div className="grid grid-cols-2 gap-x-6 gap-y-1.5">
        {fields.map((f) => (
          <div key={f.label} className="flex items-center gap-2 text-sm">
            <span className="text-muted-foreground">{f.label}:</span>
            <span className="font-medium">{formatFieldValue(f)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

type QueryData<T> =
  // biome-ignore lint/suspicious/noExplicitAny: Needed for inference
  T extends FunctionReference<any, any, any, infer Response, unknown>
    ? Response
    : never;

type AuditLogs = QueryData<typeof api.audit.list>[0];

export function AuditLogsTab() {
  const [search, setSearch] = useState("");
  const [actionFilter, setActionFilter] = useState<string>("all");

  const data = useQuery(api.audit.list, {
    actionFilter: actionFilter === "all" ? undefined : actionFilter,
  });

  const actionTypes = useMemo(() => {
    if (!data) return [];
    const unique = [...new Set(data.map((e) => e.action))].sort();
    return unique.map((action) => ({
      value: action,
      label: action.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
    }));
  }, [data]);

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

        <Select
          value={actionFilter ?? "all"}
          onValueChange={(v) => {
            return setActionFilter(isNullable(v) || isEmpty(v) ? "all" : v);
          }}
        >
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="All Events" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Events</SelectItem>
            {actionTypes.map((t) => (
              <SelectItem key={t.value} value={t.value}>
                {t.label.toLowerCase()}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <EmptyState isEmpty={filtered.length === 0}>
        <EmptyStateContent>
          <ScrollText className="h-12 w-12 text-muted-foreground" />
          <EmptyStateTitle>No audit logs found</EmptyStateTitle>
          <EmptyStateDescription>
            {actionFilter
              ? "No logs match the selected event type."
              : search
                ? "Try a different search term."
                : "Audit logs will appear here when actions like booking deletions are performed."}
          </EmptyStateDescription>
        </EmptyStateContent>

        <EmptyStateConceal>
          <ul className="rounded-md border">
            <li
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
            </li>

            {filtered.map((entry) => {
              return <AuditLogEntry key={entry._id} entry={entry} />;
            })}
          </ul>
        </EmptyStateConceal>
      </EmptyState>
    </div>
  );
}

function AuditLogEntry({ entry }: { entry: AuditLogs }) {
  const [isExpanded, setIsExpanded] = useState(false);

  const toggle = useEvent(() => setIsExpanded((e) => !e));

  return (
    <li
      className="grid gap-0 text-start text-sm border-b"
      style={{
        gridTemplateColumns: "1fr minmax(200px, 1.4fr) 1fr 1.5fr",
      }}
      onClick={() => toggle()}
      onKeyDown={(e) => {
        if (e.key === "Enter") toggle();
      }}
    >
      <div
        className={cn(
          "flex items-center gap-2 px-4 py-3",
          isExpanded && "bg-muted/30",
        )}
      >
        <ChevronDown
          className={cn(
            "h-3.5 w-3.5 text-muted-foreground shrink-0 transition-transform",
            !isExpanded && "-rotate-90",
          )}
        />
        <span className="font-mono text-foreground">
          {format(entry.timestamp, "MMM dd HH:mm")}
        </span>
      </div>

      <div
        className={cn(
          "flex items-center px-4 py-3",
          isExpanded && "bg-muted/30",
        )}
      >
        <span className="font-mono text-foreground text-xs">
          {entry.action}
        </span>
      </div>

      <div
        className={cn(
          "flex items-center px-4 py-3",
          isExpanded && "bg-muted/30",
        )}
      >
        {entry.actor ? `${entry.actor.firstName}` : "—"}
      </div>

      <div
        className={cn(
          "flex items-center px-4 py-3",
          isExpanded && "bg-muted/30",
        )}
      >
        <DetailsPreview metadata={entry.metadata} />
      </div>

      {isExpanded && (
        <div className="col-span-4 px-4 pb-4 border-b bg-muted/20">
          <MetadataCard metadata={entry.metadata} owner={entry.owner} />
        </div>
      )}
    </li>
  );
}
