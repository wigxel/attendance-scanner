"use client";
import { decodeQRCodeData } from "@/app/actions/encrypt";
import QRCodeScanner from "@/components/QRCodeScanner";
import { Button } from "@/components/ui/button";
import { isDevelopment } from "@/config/constants";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { getErrorMessage } from "@/lib/error.helpers";
import { useMutation } from "convex/react";
import { format, isToday, isValid } from "date-fns";
import { Bug } from "lucide-react";
import posthog from "posthog-js";
import { useState } from "react";
import { toast } from "sonner";
import { convex } from "./ConvexClientProvider";
import { DebugProfile } from "./forms/debug-profile";
import { If } from "./if";
import { Card } from "./ui/card";
import { Tabs, TabsList, TabsTrigger } from "./ui/tabs";

type ScanMode = "walk_in" | "reservation";

export const ScanTimeCodec = {
  encode(date: Date) {
    return format(date, "dd-MM-yyyy-hh");
  },

  decode(time_str?: string) {
    const [d, m, y, h] = String(time_str).split("-");

    const date = new Date(+y, +m - 1, +d, +h);
    const is_valid_date = isValid(date) && isToday(date);

    return { success: is_valid_date, value: date };
  },
};

export function TakeAttendance() {
  const [scannedData, setScannedData] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [scanningEnabled, setScanningEnabled] = useState(true);
  const [scanMode, setScanMode] = useState<ScanMode>("walk_in");

  const register = useMutation(api.myFunctions.registerUser);

  const handleScan = async (uri_string: string, mode: ScanMode) => {
    setScannedData(uri_string);

    try {
      const url = new URL(uri_string);
      const encoded_data = url.pathname.split("/").at(-1);

      const [customer_id, visitor_id, browser, plan, time] =
        await decodeQRCodeData(encoded_data ?? "none").catch((err) => {
          posthog.captureException(err, {
            arguments: [encoded_data],
          });
          throw err;
        });

      if (!plan && mode === "walk_in") {
        throw new Error(
          "A plan is required for walk-in. Please ensure you are scanning the latest QR Code",
        );
      }

      const result = ScanTimeCodec.decode(time);

      if (!result.success) {
        throw new Error("Invalid scan date. Scans must happen on the same day");
      }

      if (!customer_id) {
        toast.error("User does not exist or is not registered");
        return;
      }

      setProcessing(true);

      await register({
        browser: browser ?? "unknown",
        visitorId: visitor_id ?? "unknown",
        customerId: customer_id as Id<"profile">,
        plan: plan ?? "none",
        mode: mode,
      });

      const customer_info = await convex.query(api.myFunctions.getUserById, {
        userId: customer_id as Id<"profile">,
      });

      if (!customer_info) {
        throw new Error("Anomaly: Customer info not found");
      }

      toast.success(
        `Attendance recorded for ${customer_info.firstName ?? "{{firstName}}"} ${customer_info.lastName ?? "{{lastname}}"}`,
      );

      setTimeout(() => {
        setScannedData(null);
        setProcessing(false);
        setScanningEnabled(true);
      }, 2000);
    } catch (error) {
      toast.error(getErrorMessage(error));
      setProcessing(false);
    }
  };

  const handleError = (error: string) => {
    toast.error(`Error scanning QR code: ${error}`);
    setScanningEnabled(true);
  };

  const resetScanner = () => {
    setScannedData(null);
    setProcessing(false);
    setScanningEnabled(true);
  };

  return (
    <Card>
      <div className="p-4 flex flex-col gap-4">
        <Tabs
          defaultValue="walk_in"
          onValueChange={(value) => setScanMode(value as ScanMode)}
          className="w-full"
        >
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="walk_in">Walk-in</TabsTrigger>
            <TabsTrigger value="reservation">Reservation</TabsTrigger>
          </TabsList>
        </Tabs>

        {scanningEnabled ? (
          <QRCodeScanner
            onScan={(data) => {
              setScanningEnabled(false);
              handleScan(data, scanMode);
            }}
            onError={handleError}
          />
        ) : (
          <div className="flex flex-col items-center gap-4">
            {processing ? (
              <div className="text-center p-4">
                <div className="animate-pulse mb-2">Processing...</div>
                <p className="text-sm text-muted-foreground">
                  Recording attendance data
                </p>
              </div>
            ) : (
              <div className="text-center p-4">
                <div className="text-green-500 mb-2">Scan Complete</div>
                <p className="text-sm text-muted-foreground">
                  QR code processed successfully
                </p>
              </div>
            )}

            <Button
              onClick={resetScanner}
              disabled={processing}
              className="w-full"
            >
              Scan Another Code
            </Button>
          </div>
        )}

        <If cond={isDevelopment}>
          {scannedData && (
            <div className="mt-6 p-4 border rounded-lg bg-muted w-full">
              <h2 className="text-lg font-medium mb-2">QR Data:</h2>
              <p className="text-xs p-2 bg-background rounded">
                <span className="break-words block w-[35ch]">
                  {scannedData}
                </span>
              </p>
            </div>
          )}
        </If>

        <div className="p-4 border rounded-lg bg-yellow-100">
          <h2 className="text-lg font-medium mb-2">Instructions:</h2>
          <ul className="text-xs list-disc list-inside">
            <li>Select the check-in mode (Walk-in or Reservation).</li>
            <li>
              Scan the attendance QR code displayed on the member&apos;s
              profile.
            </li>
            <li>The camera will automatically detect the QR code.</li>
            <li>Attendance will be recorded instantly.</li>
          </ul>
        </div>
      </div>

      <div className="flex justify-end px-4">
        <DebugProfile>
          <Button variant={"outline"} size="lg">
            <Bug />
          </Button>
        </DebugProfile>
      </div>
    </Card>
  );
}
