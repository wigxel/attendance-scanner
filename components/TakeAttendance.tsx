"use client";
import React, { useState } from "react";
import QRCodeScanner from "@/components/QRCodeScanner";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { decodeQRCodeData } from "@/app/actions/encrypt";
import type { Id } from "@/convex/_generated/dataModel";
import { convex } from "./ConvexClientProvider";
import { getErrorMessage } from "@/lib/error.helpers";
import { isDevelopment } from "@/config/constants";
import { If } from "./if";
import { columns } from "@/components/columns";
import { DataTable } from "@/components/DataTable";

export function TakeAttendance() {
  const [scannedData, setScannedData] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [scanningEnabled, setScanningEnabled] = useState(true);

  const router = useRouter();

  // In a real implementation, you'd create a mutation to record attendance
  const register = useMutation(api.myFunctions.registerUser);

  const handleScan = async (uri_string: string) => {
    setScannedData(uri_string);
    try {
      const url = new URL(uri_string);
      const encoded_data = url.pathname.split("/").at(-1);

      // Validate the QR data format
      const [customer_id, visitor_id, browser] = await decodeQRCodeData(
        encoded_data ?? "none",
      );

      if (!customer_id) {
        toast.error("User doesn't exist or isn't registered");
        return;
      }

      const is_registered = await convex.query(
        api.myFunctions.isUserRegisteredForToday,
        {
          userId: customer_id as Id<"profile">,
        },
      );

      if (is_registered) {
        throw new Error("Customer already registered for today.");
      }

      setProcessing(true);

      // Here you would call your API to record attendance
      await register({
        browser: browser ?? "unknown",
        visitorId: visitor_id ?? "unknown",
        customerId: customer_id as Id<"profile">,
      });

      const customer_info = await convex.query(api.myFunctions.getUserById, {
        userId: customer_id as Id<"profile">,
      });

      if (!customer_info) {
        throw new Error("Anomaly: Customer info not found");
      }

      //Fetch user stats
      const userStats = await convex.query(api.myFunctions.getUserStats, {
        userId: customer_id as Id<"profile">
      });

      if (!userStats) {
        throw new Error("Anomaly: Customer info not found");
      }

      toast.success(
        `Attendance recorded for ${customer_info.firstName ?? "{{firstName}}"} ${customer_info.lastName ?? "{{lastname}}"}`,
      );

      setTimeout(() => {
        // Reset for next scan
        setScannedData(null);
        setProcessing(false);
        // Auto re-enable scanning after a delay
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

  function AdminUserTable() {
    const users = useQuery(api.myFunctions.getAllUsers);
    if (!users) {
      return <div>Loading...</div>;
    }

    return (
      <div className="p-4">
        <h1 className="text-2xl font-semibold mb-4">User Attendance Overview</h1>
        <DataTable
          columns={columns}
          data={users.map((user) => ({
            ...user,
            firstname: user.firstName,
            lastname: user.lastName,
          }))}
        />
      </div>
    );
  }

  return (
    <div>
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

      <If cond={isDevelopment}>
        {scannedData && (
          <div className="mt-6 p-4 border rounded-lg bg-muted">
            <h2 className="text-lg font-medium mb-2">QR Data:</h2>
            <pre className="text-xs overflow-auto p-2 bg-background rounded">
              {scannedData}
            </pre>
          </div>
        )}
      </If>

      <div className="mt-6 p-4 border rounded-lg bg-muted">
        <h2 className="text-lg font-medium mb-2">Instructions:</h2>
        <ul className="text-sm list-disc list-inside">
          <li>Scan the attendance QR code displayed on the member&apos;s profile</li>
          <li>The camera will automatically detect the QR code</li>
          <li>Attendance will be recorded instantly</li>
          <li>You can scan multiple codes in succession</li>
        </ul>
      </div>

      <AdminUserTable />

      <Button
        onClick={() => router.push("/occupationManagement")}
        className="w-half"
      >
        Manage Occupations
      </Button>
    </div>
  );
}
