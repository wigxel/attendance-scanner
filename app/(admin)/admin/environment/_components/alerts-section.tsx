"use client";

import { useMutation, useQuery } from "convex/react";
import { format } from "date-fns";
import { Bell } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  EmptyState,
  EmptyStateConceal,
  EmptyStateContent,
  EmptyStateDescription,
  EmptyStateTitle,
} from "@/components/empty-state";
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

// Human labels per alert type; unknown types fall back to their raw
// string so producers never have to register a label to surface.
const ALERT_TYPE_LABELS: Record<string, string> = {
  temperature_breach: "Temperature",
};

const typeLabel = (type: string) => ALERT_TYPE_LABELS[type] ?? type;

// Standard base64url -> bytes (applicationServerKey needs raw bytes).
function urlBase64ToUint8Array(base64Url: string): Uint8Array {
  const padding = "=".repeat((4 - (base64Url.length % 4)) % 4);
  const base64 = `${base64Url.replaceAll("-", "+").replaceAll("_", "/")}${padding}`;
  const raw = atob(base64);
  return Uint8Array.from(Array.from(raw, (char) => char.charCodeAt(0)));
}

const supportsPush = () =>
  typeof navigator !== "undefined" && "serviceWorker" in navigator;

export function AlertsSection() {
  const alerts = useQuery(api.roomMetrics.recentAlerts, {});
  const vapidPublicKey = useQuery(api.push.vapidPublicKey, {});
  const acknowledge = useMutation(api.roomMetrics.acknowledge);
  const subscribe = useMutation(api.push.subscribe);
  const [pushEnabled, setPushEnabled] = useState(false);

  useEffect(() => {
    if (!supportsPush()) return;

    navigator.serviceWorker.ready
      .then((registration) => registration.pushManager.getSubscription())
      .then((subscription) => setPushEnabled(Boolean(subscription)))
      .catch(() => undefined);
  }, []);

  if (alerts === undefined) {
    return <Skeleton className="h-[200px]" />;
  }

  const unacknowledgedCount = alerts.filter(
    (alert) => !alert.acknowledged,
  ).length;
  const pushUnavailable = vapidPublicKey === null || !supportsPush();

  const enablePush = async () => {
    if (!vapidPublicKey) return;

    if (Notification.permission !== "granted") {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        toast.error("Allow notifications in your browser to get alerts.");
        return;
      }
    }

    const registration = await navigator.serviceWorker.register("/sw.js");
    const subscription =
      (await registration.pushManager.getSubscription()) ??
      (await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(
          vapidPublicKey,
        ) as BufferSource,
      }));

    const keys = subscription.toJSON().keys;
    await subscribe({
      endpoint: subscription.endpoint,
      p256dh: keys?.p256dh ?? "",
      auth: keys?.auth ?? "",
    });

    setPushEnabled(true);
    toast.success("Push alerts enabled");
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Alerts</CardTitle>
        <CardDescription>
          {unacknowledgedCount === 0
            ? "All clear"
            : `${unacknowledgedCount} unacknowledged`}
        </CardDescription>
        {!pushUnavailable && (
          <Button
            variant="outline"
            size="sm"
            className="ml-auto"
            disabled={pushEnabled}
            onClick={enablePush}
          >
            <Bell className="size-4" />
            {pushEnabled ? "Push alerts enabled" : "Enable push alerts"}
          </Button>
        )}
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
            <ul className="flex flex-col gap-2">
              {alerts.map((alert) => (
                <li
                  key={alert._id}
                  className={
                    alert.acknowledged
                      ? "flex items-center justify-between gap-3 opacity-70"
                      : "flex items-center justify-between gap-3"
                  }
                >
                  <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:gap-3">
                    <span className="flex items-baseline gap-2">
                      <span
                        className={
                          alert.acknowledged
                            ? "inline-block size-2 rounded-full bg-muted-foreground/30"
                            : "inline-block size-2 motion-safe:animate-pulse rounded-full bg-amber-500"
                        }
                      />
                      <span className="font-medium">
                        {typeLabel(alert.type)}
                      </span>
                      {alert.severity && (
                        <Badge variant="secondary">{alert.severity}</Badge>
                      )}
                    </span>
                    <span className="text-sm text-muted-foreground">
                      {alert.detail}
                    </span>
                  </div>
                  <span className="flex shrink-0 items-center gap-3">
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(alert._creationTime), "MMM d, HH:mm")}
                    </span>
                    {!alert.acknowledged && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => acknowledge({ alertId: alert._id })}
                      >
                        Acknowledge
                      </Button>
                    )}
                  </span>
                </li>
              ))}
            </ul>
          </EmptyStateConceal>
        </EmptyState>
      </CardContent>
    </Card>
  );
}
