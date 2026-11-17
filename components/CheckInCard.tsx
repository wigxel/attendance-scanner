"use client";

import { useQuery } from "convex/react";
import { CheckCircle2, XIcon } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import React from "react";
import { AppLoader } from "@/components/loader";
import { APP_URL, isDevelopment } from "@/config/constants";
import { api } from "@/convex/_generated/api";
import { useProfile } from "@/hooks/auth";
import { useCheckInMode } from "@/hooks/flags";
import { useDeviceMeta, useQueryHash } from "@/hooks/tracking";
import {
  fireBirthdayConfetti,
  isBirthdayToday,
  shouldCelebrate,
} from "@/lib/birthday";
import { safeStr } from "@/lib/data.helpers";
import { ScanTimeCodec } from "@/lib/scan";
import { cn } from "@/lib/utils";

export function useGetProfileHash(profile?: { id: string } | null) {
  const device_meta = useDeviceMeta();

  const visitorId =
    device_meta.status === "success" ? device_meta.data?.visitorId : undefined;
  const browser =
    device_meta.status === "success" ? device_meta.data?.browser : undefined;
  const platform =
    device_meta.status === "success" ? device_meta.data?.platform : undefined;

  const browser_ = safeStr(browser) + safeStr(platform);

  return useQueryHash(
    [
      profile?.id,
      visitorId,
      browser_,
      "free",
      ScanTimeCodec.encode(new Date()),
    ],
    {
      enabled: Boolean(profile),
    },
  );
}

function QRCode() {
  const profile = useProfile();
  const qr_hash = useGetProfileHash(profile.data);

  const isLoading = profile.isLoading || qr_hash.isLoading;

  return (
    <div className={"relative overflow-hidden"}>
      {isLoading ? (
        <div className="absolute inset-0 bg-white/30 z-20 backdrop-blur-lg flex justify-center items-center">
          <AppLoader />
        </div>
      ) : null}

      <ResizeableQRCode hash={qr_hash.data} />
    </div>
  );
}

export function CheckInCard() {
  const mode = useCheckInMode();

  // The personal QR is only the staff-scan path; self-service modes use the
  // kiosk QR / one-tap button instead.
  if (mode !== "staff_scan") {
    return null;
  }

  return (
    <div className="border overflow-hidden rounded-2xl bg-background">
      <Refresh
        component={QRCode}
        intervalInSeconds={isDevelopment ? 10 : 300}
      />
      <p className="p-4 text-center border-t font-mono text-xs">
        Present QR Code to Staff at Check-in Counter
      </p>
    </div>
  );
}

type RefreshProps = {
  component: React.ComponentType<unknown>;
  intervalInSeconds: number;
};

function Refresh({
  component: Component,
  intervalInSeconds = 50,
}: RefreshProps) {
  const [count, setCount] = React.useState(() => crypto.randomUUID());

  React.useEffect(() => {
    const timer = setInterval(() => {
      setCount(crypto.randomUUID());
    }, intervalInSeconds * 1000);
    return () => clearInterval(timer);
  }, [intervalInSeconds]);

  return <Component key={count} />;
}

type ResizableQRCodeProps = {
  hash?: string;
  className?: string;
};

export function ResizeableQRCode({ hash, className }: ResizableQRCodeProps) {
  const [size, setSize] = React.useState<number | null>(null);
  const ref = React.useRef<HTMLDivElement>(null);

  React.useLayoutEffect(() => {
    const abortController = new AbortController();

    if (ref.current) {
      setSize(ref.current.clientWidth);
    }

    window.addEventListener(
      "resize",
      () => {
        if (ref.current) {
          setSize(ref.current.clientWidth);
        }
      },
      {
        signal: abortController.signal,
      },
    );

    return () => {
      abortController.abort();
    };
  }, []);

  const qr_view_component = (
    <QRCodeSVG
      size={size ?? 0}
      fgColor={"#111"}
      value={
        hash
          ? new URL(`/scan/${hash}`, APP_URL).toString()
          : "nice-try-nothing-to-see-here"
      }
      className={"px-4 rounded-lg shadow-lg border w-full"}
    />
  );

  return (
    <div
      ref={ref}
      className={cn("w-full aspect-square p-2 relative", className)}
    >
      {size === null ? null : (
        <>
          {!hash ? (
            <div className="absolute flex-col inset-0 items-center justify-center flex backdrop-blur-xs">
              <span className="text-red-500 bg-white w-16 aspect-square backdrop-blur-lg rounded-full flex items-center justify-center">
                <XIcon strokeWidth={2} />
              </span>
              <span className="bg-white text-red-500 font-mono px-4 py-2 rounded-full text-xs mt-2">
                Invalid QR Code
              </span>
            </div>
          ) : null}

          {qr_view_component}
        </>
      )}
    </div>
  );
}

/**
 * Fires confetti the moment the member's check-in lands on their birthday.
 * Rendered outside <NotRegistered> — that gate unmounts its children as soon
 * as registration succeeds, so the false→true flip would never be observed
 * from inside it.
 */
export function BirthdayCheckInConfetti() {
  const profile = useProfile();
  const birthday = profile.data?.birthday;
  const is_registered = useQuery(api.myFunctions.isRegisteredForToday);
  const wasRegistered = React.useRef<boolean | null>(null);

  React.useEffect(() => {
    if (is_registered === undefined) return;

    const prev = wasRegistered.current;
    wasRegistered.current = is_registered;

    // Only a live false→true flip: not the first load, not already true.
    if (prev !== false || !is_registered) return;
    if (!isBirthdayToday(birthday)) return;
    if (shouldCelebrate("checkin")) fireBirthdayConfetti();
  }, [is_registered, birthday]);

  return null;
}

type NotRegisterdProps = {
  children: React.ReactNode;
};

export function NotRegistered({ children }: NotRegisterdProps) {
  const is_registered = useQuery(api.myFunctions.isRegisteredForToday);

  if (is_registered === undefined) return null;

  if (is_registered) return null;

  return <div>{children}</div>;
}

export function CheckedInConfirmation() {
  const mode = useCheckInMode();
  const is_registered = useQuery(api.myFunctions.isRegisteredForToday);

  // Self-service modes already show their own "You're checked in" card.
  if (mode !== "staff_scan") return null;

  // Nothing while the query loads or before staff scan lands; the QR card
  // covers those cases.
  if (!is_registered) return null;

  return (
    <div className="border overflow-hidden rounded-lg bg-background">
      <div className="p-4 flex items-center gap-3">
        <CheckCircle2 className="h-6 w-6 text-green-500 shrink-0" />
        <div>
          <p className="font-semibold text-base tracking-tight">Checked in</p>
          <p className="text-xs text-muted-foreground font-medium">
            Staff confirmed your check-in for today.
          </p>
        </div>
      </div>
    </div>
  );
}
