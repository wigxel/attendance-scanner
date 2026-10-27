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
const RETRY_INTERVAL = 15 * 1000;

/** QR payloads expire after 5 minutes: retry fast after a failed refresh. */
export function nextRefreshDelay(succeeded: boolean): number {
  return succeeded ? REFRESH_INTERVAL : RETRY_INTERVAL;
}

type QrPanelProps = {
  token: string | null;
  qrUrl: string;
  generating: boolean;
};

function QrPanel({ token, qrUrl, generating }: QrPanelProps) {
  // No valid token: keep the QR shape on screen but unreadable, like the
  // account page blurred placeholder.
  const scannable = token !== null;

  return (
    <div className="w-[320px] h-[320px] relative overflow-hidden">
      <QRCodeSVG
        value={qrUrl}
        size={320}
        fgColor="#000000"
        bgColor="#ffffff"
        className={scannable ? "" : "blur-lg"}
      />

      {!scannable && (
        <div className="absolute inset-0 flex items-center justify-center">
          {generating ? (
            <AppSpinner size="xl" />
          ) : (
            <span className="bg-white/80 text-muted-foreground font-mono px-4 py-2 rounded-full text-xs">
              No active code
            </span>
          )}
        </div>
      )}
    </div>
  );
}

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
      return true;
    } catch {
      // Keep the kiosk honest: never leave an expired QR scannable.
      setToken(null);
      return false;
    } finally {
      setGenerating(false);
    }
  });

  useEffect(() => {
    if (isLoading || !authUserId) return;

    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;

    const refresh = async (adminId: string) => {
      const succeeded = await refreshToken(adminId);
      if (cancelled) return;
      timer = setTimeout(() => refresh(adminId), nextRefreshDelay(succeeded));
    };

    refresh(authUserId);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
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
          <QrPanel token={token} qrUrl={qrUrl} generating={generating} />
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
