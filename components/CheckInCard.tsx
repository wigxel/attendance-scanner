"use client";
import { APP_URL, isDevelopment } from "@/config/constants";
import { useProfile } from "@/hooks/auth";
import { useDeviceMeta, useQueryHash } from "@/hooks/tracking";
import { safeObj } from "@/lib/data.helpers";
import { cn } from "@/lib/utils";
import { LucideLoader, XIcon } from "lucide-react";
import { motion as m } from "motion/react";
import { QRCodeSVG } from "qrcode.react";
import React from "react";
import { ScanTimeCodec } from "./TakeAttendance";
import { If } from "./if";

export function useGetProfileHash(profile?: { id: string } | null) {
  const device_meta = useDeviceMeta();

  return useQueryHash(
    [
      profile?.id,
      // @ts-expect-error Not important
      device_meta?.data?.visitorId,
      // @ts-expect-error Not important
      device_meta?.data?.browser,
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
          <div className="bg-white rounded-full p-4">
            <LucideLoader
              size={"2rem"}
              strokeWidth={1}
              className="animate animate-spin"
            />
          </div>
        </div>
      ) : null}

      <ResizeableQRCode hash={qr_hash.data} />

      <If cond={isDevelopment}>
        <p>ProfileId: {JSON.stringify(Object.keys(safeObj(profile.data)))}</p>
      </If>
    </m.div>
  );
}

export function CheckInCard() {
  return (
    <div className="border overflow-hidden rounded-2xl bg-background dark:bg-gray-950">
      <QRCode />
      <p className="p-4 text-center border-t font-mono text-xs">
        Present QR Code to Staff at Check-in Counter
      </p>
    </div>
  );
}

export function ResizeableQRCode({
  hash,
  className,
}: { hash?: string; className?: string }) {
  const [size, setSize] = React.useState<number | null>(null);
  const ref = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
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
