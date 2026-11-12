"use client";
import { useMutation, useQuery } from "convex/react";
import { CheckCircle2, XCircle } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { decodeQRCodeData } from "@/app/actions/encrypt";
import { Footer } from "@/components/footer";
import { Header } from "@/components/header";
import { AppSpinner } from "@/components/loader";
import { Button } from "@/components/ui/button";
import { api } from "@/convex/_generated/api";
import type { CustomerRegisterTuple } from "@/hooks/tracking";
import { getErrorMessage } from "@/lib/error.helpers";
import { resolveScan, toRegisterArgs } from "@/lib/scan";
import { cn } from "@/lib/utils";

type FlowStatus = "loading" | "success" | "already-registered" | "error";

function StaffScanFlow() {
  const router = useRouter();
  const params = useParams();

  const hash = params?.hash as string;

  const [status, setStatus] = useState<FlowStatus>("loading");
  const [decoded, setDecoded] = useState<CustomerRegisterTuple | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>();
  const triggered = useRef(false);

  const customerId = decoded?.[0];

  const activeBooking = useQuery(
    api.bookings.getUserActiveBookings,
    customerId ? { userId: customerId } : "skip",
  );

  const customer = useQuery(
    api.myFunctions.getUserById,
    customerId ? { userId: customerId } : "skip",
  );

  const register = useMutation(api.myFunctions.registerUser);

  // Only trust a scan whose code is stamped today and whose member the
  // backend would accept; resolveScan picks the only valid mode.
  const resolved =
    decoded && activeBooking !== undefined
      ? resolveScan(decoded, activeBooking !== null)
      : null;

  // Step 1: read the member's details out of the scanned code (once).
  useEffect(() => {
    decodeQRCodeData(hash)
      .then((tuple) => setDecoded(tuple))
      .catch(() => {
        setErrorMessage("Could not read this code. Check your connection.");
        setStatus("error");
      });
  }, [hash]);

  // Step 2: once the booking lookup settles, register the member (once).
  useEffect(() => {
    if (resolved?.status !== "ready") return;
    if (triggered.current) return;
    triggered.current = true;

    register(toRegisterArgs(resolved))
      .then(() => {
        toast.success("Attendance recorded");
        setStatus("success");
      })
      .catch((error) => {
        const message = getErrorMessage(error);

        if (message.toLowerCase().includes("already registered")) {
          setStatus("already-registered");
          return;
        }

        setErrorMessage(message);
        setStatus("error");
      });
  }, [resolved, register]);

  const memberName =
    [customer?.firstName, customer?.lastName]
      .filter((name) => Boolean(name))
      .join(" ") || "This member";

  const gotoDashboard = () => router.push("/admin/dashboard");

  if (resolved?.status === "invalid") {
    return (
      <StatusScreen
        icon={<XCircle size="3rem" className="text-red-500" />}
        title="This code isn&rsquo;t valid"
        body="Member codes only work on the day they are shown. Ask the member to open their account page, then scan the fresh code."
        action={
          <Button variant="outline" onClick={gotoDashboard}>
            Go to Dashboard
          </Button>
        }
      />
    );
  }

  if (status === "success" || status === "already-registered") {
    return (
      <StatusScreen
        tone="success"
        icon={<CheckCircle2 size="3rem" className="text-green-500" />}
        title={status === "success" ? "Checked in" : "Already checked in"}
        body={
          status === "success"
            ? `${memberName} is checked in for today.`
            : `${memberName} was already checked in today.`
        }
        action={
          <Button variant="outline" onClick={gotoDashboard}>
            Go to Dashboard
          </Button>
        }
      />
    );
  }

  if (status === "error") {
    return (
      <StatusScreen
        icon={<XCircle size="3rem" className="text-red-500" />}
        title="Something went wrong"
        body={errorMessage}
        action={
          <Button onClick={() => window.location.reload()}>Try Again</Button>
        }
      />
    );
  }

  const isRegistering = resolved?.status === "ready";

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6">
      <div className="bg-white rounded-full p-6 shadow-lg">
        <AppSpinner size="xl" />
      </div>
      <div className="text-center">
        <p className="text-lg font-semibold">
          {isRegistering
            ? `Checking in ${customer?.firstName ?? "member"}...`
            : "Reading the code..."}
        </p>
        <p className="text-sm text-muted-foreground mt-1">
          Please wait a moment
        </p>
      </div>
    </div>
  );
}

type StatusScreenProps = {
  icon: ReactNode;
  title: string;
  body: ReactNode;
  action: ReactNode;
  tone?: "success" | "danger";
};

function StatusScreen({
  icon,
  title,
  body,
  action,
  tone = "danger",
}: StatusScreenProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6">
      <div
        className={cn(
          "rounded-full p-6",
          tone === "success" ? "bg-green-50" : "bg-red-50",
        )}
      >
        {icon}
      </div>
      <div className="text-center">
        <p className="text-xl font-semibold">{title}</p>
        <p className="text-sm text-muted-foreground mt-1">{body}</p>
      </div>
      {action}
    </div>
  );
}

export default function StaffScanCheckIn() {
  return (
    <>
      <title>Staff Check-In | InSpace</title>
      <div className="fixed inset-0 z-0 scanline-container pointer-events-none" />
      <div className="z-[2] relative">
        <Header />
        <main className="px-4">
          <StaffScanFlow />
        </main>
        <Footer />
      </div>
    </>
  );
}
