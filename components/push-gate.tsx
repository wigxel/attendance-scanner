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

// Checking, subscribed and unavailable (missing VAPID keys) all stay out of
// the way, so anything not listed here hides the gate.
const GATE_STATE_BY_STATUS: Partial<Record<PushStatus, GateState>> = {
  ask: "ask",
  blocked: "blocked",
  unsupported: "unsupported",
};

export const resolveGate = (status: PushStatus): GateState =>
  GATE_STATE_BY_STATUS[status] ?? "hidden";

type GateCopy = { title: string; body: string; action: string };

const COPY: Record<Exclude<GateState, "hidden">, GateCopy> = {
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
      <AlertDialogContent className="flex h-dvh w-screen max-w-none items-center justify-center rounded-none border-0 p-6 sm:max-w-none bg-background/70 backdrop-blur-sm">
        <div className="mx-auto flex max-w-md flex-col items-center gap-6 text-center">
          <AlertDialogHeader className="items-center">
            <AlertDialogTitle>{copy.title}</AlertDialogTitle>
            <AlertDialogDescription className="mb-8 max-w-[40ch] text-center">{copy.body}</AlertDialogDescription>
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
