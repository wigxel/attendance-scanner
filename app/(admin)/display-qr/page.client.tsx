"use client";
import { RefreshCw } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { useEffect, useState } from "react";
import { useEvent } from "react-use-event-hook";
import { generateQRToken } from "@/app/actions/encrypt";
import { AppSpinner } from "@/components/loader";
import { APP_URL } from "@/config/constants";
import { useAuthId } from "@/hooks/auth";

const REFRESH_INTERVAL = 5 * 60 * 1000;

export default function DisplayQRCSR() {
  const { id: authUserId, isLoading } = useAuthId();
  const [token, setToken] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(REFRESH_INTERVAL);
  const [generating, setGenerating] = useState(true);

  const refreshToken = useEvent(async (adminId: string) => {
    setGenerating(true);
    try {
      const t = await generateQRToken(adminId);
      setToken(t);
      setCountdown(REFRESH_INTERVAL);
    } finally {
      setGenerating(false);
    }
  });

  useEffect(() => {
    if (isLoading || !authUserId) return;

    refreshToken(authUserId);

    const interval = setInterval(() => {
      refreshToken(authUserId);
    }, REFRESH_INTERVAL);

    return () => clearInterval(interval);
  }, [isLoading, refreshToken, authUserId]);

  useEffect(() => {
    const interval = setInterval(() => {
      setCountdown((prev) => Math.max(0, prev - 1000));
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[80vh]">
        <AppSpinner size="xl" />
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
              <AppSpinner size="xl" />
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
