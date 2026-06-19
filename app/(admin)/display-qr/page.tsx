"use client";

import { useUser } from "@clerk/nextjs";
import { LucideLoader, RefreshCw } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { useEffect, useState } from "react";
import { generateQRToken } from "@/app/actions/encrypt";
import { Header } from "@/components/header";
import { APP_URL } from "@/config/constants";

const REFRESH_INTERVAL = 5 * 60 * 1000;

export default function DisplayQRPage() {
  const { user, isLoaded } = useUser();
  const [token, setToken] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(REFRESH_INTERVAL);
  const [generating, setGenerating] = useState(true);

  const refreshToken = async (adminId: string) => {
    setGenerating(true);
    try {
      const t = await generateQRToken(adminId);
      setToken(t);
      setCountdown(REFRESH_INTERVAL);
    } finally {
      setGenerating(false);
    }
  };

  useEffect(() => {
    if (!isLoaded || !user) return;

    refreshToken(user.id);

    const interval = setInterval(() => {
      refreshToken(user.id);
    }, REFRESH_INTERVAL);

    return () => clearInterval(interval);
  }, [isLoaded, user]);

  useEffect(() => {
    const interval = setInterval(() => {
      setCountdown((prev) => Math.max(0, prev - 1000));
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  if (!isLoaded || !user) {
    return (
      <div className="flex items-center justify-center min-h-[80vh]">
        <LucideLoader
          size="2rem"
          className="animate-spin text-muted-foreground"
        />
      </div>
    );
  }

  const qrUrl = token ? `${APP_URL}/checkin/${token}` : APP_URL;
  const mins = Math.floor(countdown / 60000);
  const secs = Math.floor((countdown % 60000) / 1000);

  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] px-4">
      <div className="flex flex-col items-center gap-6 max-w-lg text-center">
        <h1 className="text-3xl font-bold tracking-tight">Scan to Check In</h1>
        <p className="text-muted-foreground">
          Point your camera at the QR code below to check in or check out.
        </p>

        <div
          className={`relative bg-white p-4 rounded-2xl shadow-lg border transition-opacity ${generating ? "opacity-50" : "opacity-100"}`}
        >
          {token ? (
            <QRCodeSVG
              value={qrUrl}
              size={320}
              fgColor="#000000"
              bgColor="#ffffff"
            />
          ) : (
            <div className="w-[320px] h-[320px] flex items-center justify-center">
              <LucideLoader
                size="3rem"
                className="animate-spin text-muted-foreground"
              />
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <RefreshCw size="1rem" className={generating ? "animate-spin" : ""} />
          <span>
            Refreshes in {mins}:{secs.toString().padStart(2, "0")}
          </span>
        </div>

        <p className="text-xs text-muted-foreground font-mono break-all max-w-sm">
          {qrUrl}
        </p>
      </div>
    </div>
  );
}
