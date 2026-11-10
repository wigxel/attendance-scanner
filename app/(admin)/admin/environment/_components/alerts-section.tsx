"use client";

import { useMutation, useQuery } from "convex/react";
import { format } from "date-fns";
import { capitalize } from "effect/String";
import { BellOffIcon, BellRingIcon, CheckIcon } from "lucide-react";
import {
  EmptyState,
  EmptyStateConceal,
  EmptyStateContent,
  EmptyStateDescription,
  EmptyStateTitle,
} from "@/components/empty-state";
import { PulsingDot } from "@/components/pulsing-dot";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/convex/_generated/api";
import { usePushNotifications } from "@/hooks/use-push-notifications";
import { cn } from "@/lib/utils";

// Human labels per alert type; unknown types fall back to their raw
// string so producers never have to register a label to surface.
const ALERT_TYPE_LABELS: Record<string, string> = {
  temperature_breach: "Temperature",
};

const typeLabel = (type: string) => ALERT_TYPE_LABELS[type] ?? type;

export function AlertsSection() {
  const alerts = useQuery(api.roomMetrics.recentAlerts, {});
  const acknowledge = useMutation(api.roomMetrics.acknowledge);
  const { status, busy, available, enable } = usePushNotifications();
  const pushEnabled = status === "subscribed";

  if (alerts === undefined) {
    return <Skeleton className="h-[200px]" />;
  }

  const unacknowledgedCount = alerts.filter(
    (alert) => !alert.acknowledged,
  ).length;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center">
        <div className="shrink-0 flex-1">
          <CardTitle>Alerts</CardTitle>
          <CardDescription>
            {unacknowledgedCount === 0
              ? "All clear"
              : `${unacknowledgedCount} unacknowledged`}
          </CardDescription>
        </div>

        <div className="flex">
          {available && (
            <Button
              variant="outline"
              size="sm"
              className="ml-auto"
              title={
                pushEnabled
                  ? "Push notifications are on"
                  : "Enable push notifications"
              }
              disabled={pushEnabled || busy}
              onClick={enable}
            >
              {pushEnabled ? (
                <BellRingIcon className="size-4" />
              ) : (
                <BellOffIcon className="size-4" />
              )}
              {pushEnabled ? "Enabled" : "Enable"}
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent>
        <EmptyState isEmpty={alerts.length === 0}>
          <EmptyStateContent className="py-8">
            <EmptyStateTitle>All clear</EmptyStateTitle>
            <EmptyStateDescription>
              No anomalies yet. You&apos;ll see them here as sensors report.
            </EmptyStateDescription>
          </EmptyStateContent>

          <EmptyStateConceal>
            <ul className="flex flex-col gap-2 -mx-4">
              {alerts.map((alert) => (
                <li
                  key={alert._id}
                  className={cn(
                    "text-xs px-4 py-2 items-center hover:bg-white/5 cursor-default rounded-md",
                    alert.acknowledged ? "flex gap-2 opacity-70" : "flex gap-2",
                  )}
                >
                  <div className="flex flex-col flex-1 gap-1 pl-3">
                    <span className="flex items-center gap-2 -ml-4">
                      <PulsingDot active={!alert.acknowledged} />

                      <span className="font-medium">
                        {typeLabel(alert.type)}
                      </span>
                      {alert.severity && (
                        <Badge variant="secondary">{alert.severity}</Badge>
                      )}
                    </span>

                    <span className="text-muted-foreground">
                      {capitalize(alert.detail)}
                    </span>

                    <span className="flex items-center justify-between gap-3">
                      <span className="text-xs text-muted-foreground/50">
                        {format(new Date(alert._creationTime), "MMM d, HH:mm")}
                      </span>
                    </span>
                  </div>

                  <div className="-me-2">
                    {!alert.acknowledged && (
                      <Button
                        size="icon"
                        variant="outline-active"
                        title="Acknowledge"
                        onClick={() => acknowledge({ alertId: alert._id })}
                      >
                        <CheckIcon />
                      </Button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </EmptyStateConceal>
        </EmptyState>
      </CardContent>
    </Card>
  );
}
