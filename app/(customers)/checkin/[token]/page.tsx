"use client";
import { useUser } from "@clerk/nextjs";
import { Effect, pipe } from "effect";
import { CheckCircle2, LogIn, XCircle } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { verifyQRToken } from "@/app/actions/encrypt";
import { Footer } from "@/components/footer";
import { Header } from "@/components/header";
import { AppSpinner } from "@/components/loader";
import { Button } from "@/components/ui/button";
import { savePendingCheckIn } from "@/hooks/pending-checkin";
import {
  formatTime,
  useSelfCheckIn,
  useTodaysRegistration,
} from "@/hooks/self-service";
import { getErrorMessage } from "@/lib/error.helpers";
import { O } from "@/lib/fp.helpers";

type CheckInStatus =
  | "verifying-token"
  | "token-expired"
  | "token-invalid"
  | "timeout"
  | "requires-auth"
  | "checking-in"
  | "success"
  | "already-registered"
  | "error";

function TokenCheckInFlow() {
  const router = useRouter();
  const params = useParams();
  const { user, isLoaded, isSignedIn } = useUser();

  const token = params?.token as string;

  const [status, setStatus] = useState<CheckInStatus>(() =>
    !token ? "token-invalid" : "verifying-token",
  );
  const [adminId, setAdminId] = useState<string | undefined>();
  const [checkedInAt, setCheckedInAt] = useState<string | undefined>();

  const registration = useTodaysRegistration();
  const selfCheckIn = useSelfCheckIn();
  const triggered = useRef(false);

  const isFetchingRegisterData = registration === undefined;

  // Step 1: Verify the QR token
  useEffect(() => {
    if (!token) {
      return;
    }

    const promise = pipe(
      Effect.tryPromise({
        try: () => verifyQRToken(token),
        catch: (e) => new Error(getErrorMessage(e)),
      }),
      Effect.timeoutOption(10_000),
      Effect.runPromise,
    );

    promise
      .then((option) => {
        if (O.isNone(option)) return setStatus("timeout");

        setAdminId(option.value.adminId);

        // If auth state is loaded and user is not signed in, require auth
        if (isLoaded && !isSignedIn) {
          savePendingCheckIn(option.value.adminId);
          setStatus("requires-auth");
          return;
        }

        setStatus("checking-in");
      })
      .catch((err) => {
        const msg = err.message.toLowerCase();
        if (msg.includes("expired")) {
          return setStatus("token-expired");
        }
        return setStatus("token-invalid");
      });
  }, [token, isLoaded, isSignedIn]);

  // Step 2: Handle auth-required → redirect to sign in after brief message
  useEffect(() => {
    if (status !== "requires-auth") return;

    const timeout = setTimeout(() => {
      router.push("/auth");
    }, 2000);

    return () => clearTimeout(timeout);
  }, [status, router]);

  // Step 2b: If user becomes signed in while on this page (e.g. tab switch),
  // transition to checking-in
  useEffect(() => {
    if (status === "requires-auth" && isSignedIn && adminId) {
      setTimeout(() => setStatus("checking-in"), 0);
    }
  }, [status, isSignedIn, adminId]);

  // Step 3: Perform the check-in
  useEffect(() => {
    if (status !== "checking-in") return;
    if (isFetchingRegisterData) return;

    if (registration) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setCheckedInAt(registration.timestamp);
      setStatus("already-registered");
      return;
    }

    if (triggered.current) return;
    triggered.current = true;

    selfCheckIn({ method: "qr", adminId })
      .then(() => {
        toast.success("Checked in successfully!");
        setStatus("success");
      })
      .catch((err) => {
        const msg = getErrorMessage(err).toLowerCase();
        if (msg.includes("already registered")) {
          setStatus("already-registered");
        } else {
          setStatus("error");
          toast.error(getErrorMessage(err));
        }
      });
  }, [status, registration, adminId, selfCheckIn, isFetchingRegisterData]);


  if (status === "verifying-token" || status === "checking-in") {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6">
        <div className="bg-white rounded-full p-6 shadow-lg">
          <AppSpinner size="xl" />
        </div>
        <div className="text-center">
          <p className="text-lg font-semibold">
            {status === "checking-in"
              ? "Checking you in..."
              : "Verifying QR code..."}
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            Please wait a moment
          </p>
        </div>
      </div>
    );
  }

  if (status === "requires-auth") {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6">
        <div className="bg-blue-50 rounded-full p-6">
          <LogIn size="3rem" className="text-blue-500" />
        </div>
        <div className="text-center">
          <p className="text-xl font-semibold">Sign in required</p>
          <p className="text-sm text-muted-foreground mt-1">
            Please sign in or create an account to check in. Redirecting
            you&hellip;
          </p>
          <p className="text-xs text-muted-foreground mt-2">
            Your check-in will be saved for 5 minutes.
          </p>
        </div>
        <Button onClick={() => router.push("/auth")}>
          Sign In
        </Button>
      </div>
    );
  }

  if (status === "token-expired") {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6">
        <div className="bg-red-50 rounded-full p-6">
          <XCircle size="3rem" className="text-red-500" />
        </div>
        <div className="text-center">
          <p className="text-xl font-semibold">QR code expired</p>
          <p className="text-sm text-muted-foreground mt-1">
            This QR code is no longer valid. Please scan a fresh code at the
            entrance.
          </p>
        </div>
        <Button variant="outline" onClick={() => router.push("/account")}>
          Go to Account
        </Button>
      </div>
    );
  }

  if (status === "token-invalid") {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6">
        <div className="bg-red-50 rounded-full p-6">
          <XCircle size="3rem" className="text-red-500" />
        </div>
        <div className="text-center">
          <p className="text-xl font-semibold">Invalid QR code</p>
          <p className="text-sm text-muted-foreground mt-1">
            This QR code is not valid. Please scan the official QR code at the
            entrance.
          </p>
        </div>
        <Button variant="outline" onClick={() => router.push("/account")}>
          Go to Account
        </Button>
      </div>
    );
  }

  if (status === "timeout") {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6">
        <div className="bg-red-50 rounded-full p-6">
          <XCircle size="3rem" className="text-red-500" />
        </div>
        <div className="text-center">
          <p className="text-xl font-semibold">Connection timed out</p>
          <p className="text-sm text-muted-foreground mt-1">
            Could not verify the QR code. Please check your connection and try
            again.
          </p>
        </div>
        <Button onClick={() => window.location.reload()}>Try Again</Button>
      </div>
    );
  }

  if (status === "success" || status === "already-registered") {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6">
        <div className="bg-green-50 rounded-full p-6">
          <CheckCircle2 size="3rem" className="text-green-500" />
        </div>
        <div className="text-center">
          <p className="text-xl font-semibold">
            {status === "success"
              ? `Welcome, ${user?.firstName ?? "there"}!`
              : "You're already checked in"}
          </p>
          {checkedInAt && (
            <p className="text-sm text-muted-foreground mt-1">
              Since {formatTime(checkedInAt)}
            </p>
          )}
        </div>
        <Button variant="outline" onClick={() => router.push("/account")}>
          Go to Account
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6">
      <div className="bg-red-50 rounded-full p-6">
        <XCircle size="3rem" className="text-red-500" />
      </div>
      <div className="text-center">
        <p className="text-xl font-semibold">Something went wrong</p>
        <p className="text-sm text-muted-foreground mt-1">
          Could not complete check-in. Please try again or see the front desk.
        </p>
      </div>
      <Button onClick={() => window.location.reload()}>Try Again</Button>
    </div>
  );
}

export default function TokenCheckInPage() {
  return (
    <>
      <title>Check In | InSpace</title>
      <div className="fixed inset-0 z-0 scanline-container pointer-events-none" />
      <div className="z-[2] relative">
        <Header />
        <main className="px-4">
          <TokenCheckInFlow />
        </main>
        <Footer />
      </div>
    </>
  );
}
