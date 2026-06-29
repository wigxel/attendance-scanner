"use client";
import { useFlags } from "@flagsmith/flagsmith/react";
import { useQuery } from "convex/react";
import { XIcon } from "lucide-react";
import { motion as m } from "motion/react";
import { QRCodeSVG } from "qrcode.react";
import React from "react";
import { AppLoader } from "@/components/loader";
import { APP_URL, isDevelopment } from "@/config/constants";
import { api } from "@/convex/_generated/api";
import { useProfile } from "@/hooks/auth";
import { useDeviceMeta, useQueryHash } from "@/hooks/tracking";
import { safeObj, safeStr } from "@/lib/data.helpers";
import { cn } from "@/lib/utils";
import { If } from "./if";
import { ScanTimeCodec } from "./TakeAttendance";

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
    <m.div
      initial={{ height: 150 }}
      animate={isLoading ? { height: 150 } : { height: "100%" }}
      className={"relative overflow-hidden"}
    >
      {isLoading ? (
        <div className="absolute inset-0 bg-white/[0.3] z-20 backdrop-blur-lg flex justify-center items-center">
          <AppLoader />
        </div>
      ) : null}

      <ResizeableQRCode hash={qr_hash.data} />
    </m.div>
  );
}

export function CheckInCard() {
  const flags = useFlags(["customer_scanning"]);

  if (flags.customer_scanning.enabled) {
    return null;
  }

  return (
    <div className="border overflow-hidden rounded-2xl bg-background dark:bg-gray-950">
      <Refresh component={QRCode} interval={10} />
      <p className="p-4 text-center border-t font-mono text-xs">
        Present QR Code to Staff at Check-in Counter
      </p>
    </div>
  );
}

function Refresh({
  component: Component,
  interval,
}: {
  component: React.ComponentType<unknown>;
  interval: number;
}) {
  const [count, setCount] = React.useState(() => crypto.randomUUID());

  React.useEffect(() => {
    const timer = setInterval(() => {
      setCount(crypto.randomUUID());
    }, interval * 1000);
    return () => clearInterval(timer);
  }, [interval]);

  return <Component key={count} />;
}

export function ResizeableQRCode({
  hash,
  className,
}: {
  hash?: string;
  className?: string;
}) {
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

export function NotRegistered({ children }: { children: React.ReactNode }) {
  const is_registered = useQuery(api.myFunctions.isRegisteredForToday);

  if (is_registered === undefined) return null;

  if (is_registered) return null;

  return <div>{children}</div>;
}
