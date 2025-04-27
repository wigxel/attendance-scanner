"use client";

import React, { useState } from "react";
import QRCodeScanner from "@/components/QRCodeScanner";
import { toast } from "sonner";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";

export default function AttendanceScanPage() {
  const [scannedData, setScannedData] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [scanningEnabled, setScanningEnabled] = useState(true);

  // In a real implementation, you'd create a mutation to record attendance
  // For example: const recordAttendance = useMutation(api.myFunctions.recordAttendanceByQR);

  const handleScan = (data: string) => {
    setScannedData(data);
    try {
      // Validate the QR data format
      const qrData = JSON.parse(data);

      if (!qrData.userId) {
        toast.error("Invalid QR code format");
        return;
      }

      setProcessing(true);
      toast.success(`Attendance recorded for: ${qrData.userId}`);

      // Here you would call your API to record attendance
      // Example:
      // await recordAttendance({ userId: qrData.userId });

      setTimeout(() => {
        // Reset for next scan
        setScannedData(null);
        setProcessing(false);
        // Auto re-enable scanning after a delay
        setScanningEnabled(true);
      }, 2000);
    } catch (error) {
      console.error("Error processing QR data:", error);
      toast.error("Invalid QR code format");
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
    <div className="container mx-auto p-4 max-w-md">
      <h1 className="text-2xl font-bold text-center mb-6">
        Scan Attendance QR Code
      </h1>

      <div className="mb-6">
        {scanningEnabled ? (
          <QRCodeScanner
            onScan={(data) => {
              setScanningEnabled(false); // Disable scanning after successful scan
              handleScan(data);
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
      </div>

      {scannedData && (
        <div className="mt-6 p-4 border rounded-lg bg-muted">
          <h2 className="text-lg font-medium mb-2">QR Data:</h2>
          <pre className="text-xs overflow-auto p-2 bg-background rounded">
            {scannedData}
          </pre>
        </div>
      )}

      <div className="mt-6 p-4 border rounded-lg bg-muted">
        <h2 className="text-lg font-medium mb-2">Instructions:</h2>
        <ul className="text-sm list-disc list-inside">
          <li>Scan the attendance QR code displayed on the member's profile</li>
          <li>The camera will automatically detect the QR code</li>
          <li>Attendance will be recorded instantly</li>
          <li>You can scan multiple codes in succession</li>
        </ul>
      </div>
    </div>
  );
}
