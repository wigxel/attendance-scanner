"use client";

import { useMutation, useQuery } from "convex/react";
import { format } from "date-fns";
import { capitalize } from "effect/String";
import { BellOffIcon, BellRingIcon, CheckIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
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
import { cn } from "@/lib/utils";

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
  const unsubscribe = useMutation(api.push.unsubscribe);
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

  const disablePush = async () => {
    const registration = await navigator.serviceWorker.register("/sw.js");
    const subscription = await registration.pushManager.getSubscription();

    // Drop both sides, so a rotated endpoint cannot leave a stale row behind
    // and keep delivering duplicate notifications.
    if (subscription) {
      await subscription.unsubscribe();
      await unsubscribe({ endpoint: subscription.endpoint });
    }

    setPushEnabled(false);
    toast.success("Push alerts disabled");
  };

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
          {!pushUnavailable && (
            <Button
              variant="outline"
              size="sm"
              className="ml-auto"
              title={
                pushEnabled ? "Disable push alerts" : "Enable push notification"
              }
              onClick={pushEnabled ? disablePush : enablePush}
            >
              {pushEnabled ? (
                <BellRingIcon className="size-4" />
              ) : (
                <BellOffIcon className="size-4" />
              )}
              {pushEnabled ? "Enable" : "Disable"}
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
