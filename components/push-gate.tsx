"use client";

import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  type PushStatus,
  usePushNotifications,
} from "@/hooks/use-push-notifications";

export type GateState = "hidden" | "ask" | "blocked" | "unsupported";

export function resolveGate(status: PushStatus): GateState {
  switch (status) {
    case "ask":
    case "blocked":
    case "unsupported":
      return status;
    default:
      // checking, subscribed and unavailable (missing VAPID keys) all stay
      // out of the way.
      return "hidden";
  }
}

const COPY: Record<
  Exclude<GateState, "hidden">,
  { title: string; body: string; action: string }
> = {
  ask: {
    title: "Turn on notifications for this device",
    body: "Guest overstay and environment alerts arrive as push notifications. The staff app needs them enabled on this browser.",
    action: "Enable notifications",
  },
  blocked: {
    title: "Notifications are blocked for this site",
    body: "Open the padlock/site settings in your browser, set Notifications to Allow, then press Check again.",
    action: "Check again",
  },
  unsupported: {
    title: "This browser cannot receive notifications",
    body: "Open the staff app in Chrome or Edge on a supported device.",
    action: "Check again",
  },
};

export function PushGate() {
  const { status, error, busy, enable, recheck } = usePushNotifications();
  const state = resolveGate(status);

  if (state === "hidden") return null;

  const asking = state === "ask";
  const copy = COPY[state];

  return (
    <AlertDialog open>
      <AlertDialogContent className="flex h-dvh w-screen max-w-none items-center justify-center rounded-none border-0 p-6 sm:max-w-none">
        <div className="mx-auto flex max-w-md flex-col items-center gap-6 text-center">
          <AlertDialogHeader className="items-center">
            <AlertDialogTitle>{copy.title}</AlertDialogTitle>
            <AlertDialogDescription>{copy.body}</AlertDialogDescription>
          </AlertDialogHeader>

          {error && (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          )}

          <Button size="lg" disabled={busy} onClick={asking ? enable : recheck}>
            {copy.action}
          </Button>
        </div>
      </AlertDialogContent>
    </AlertDialog>
  );
}
