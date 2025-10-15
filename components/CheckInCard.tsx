"use client";
import { APP_URL } from "@/config/constants";
import { useProfile } from "@/hooks/auth";
import { useDeviceMeta, useQueryHash } from "@/hooks/tracking";
import { LucideLoader } from "lucide-react";
import { motion as m } from "motion/react";
import { QRCodeSVG } from "qrcode.react";
import React from "react";
import { ScanTimeCodec } from "./TakeAttendance";

function useDo() {
  const profile = useProfile();
  const device_meta = useDeviceMeta();

  return useQueryHash(
    [
      profile.data?.id,
      // @ts-expect-error Not important
      device_meta?.data?.visitorId,
      // @ts-expect-error Not important
      device_meta?.data?.browser,
      "free",
      ScanTimeCodec.encode(new Date())
    ],
    {
      enabled: Boolean(profile),
    },
  );
}

function QRCode() {
  const [size, setSize] = React.useState<number | null>(null);
  const ref = React.useRef<HTMLDivElement>(null);
  const device_meta = useDeviceMeta();
  const profile = useProfile();
  const qr_hash = useDo();


  const isLoading =
    device_meta.isLoading || profile.isLoading || qr_hash.isLoading;

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

      <div ref={ref} className={"w-full aspect-square p-2 relative"}>
        {size === null ? null : (
          <QRCodeSVG
            size={size}
            fgColor={"#111"}
            value={
              qr_hash.data
                ? new URL(`/scan/${qr_hash.data}`, APP_URL).toString()
                : "nice-try-nothing-to-see-here"
            }
            className="px-4 rounded-lg shadow-lg border w-full"
          />
        )}
      </div>
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
