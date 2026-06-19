"use client";

import { useFlags } from "@flagsmith/flagsmith/react";
import { useMutation } from "convex/react";
import { isNullable } from "effect/Predicate";
import {
  CheckCircle2,
  InfoIcon,
  LogOut,
  LucideLoader,
  Star,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { api } from "@/convex/_generated/api";
import {
  formatDuration,
  formatTime,
  useSelfCheckIn,
  useSelfCheckOut,
  useTodaysRating,
  useTodaysRegistration,
} from "@/hooks/self-service";
import { useDeviceMeta } from "@/hooks/tracking";
import { getErrorMessage } from "@/lib/error.helpers";
import { FlagsCustomerScan } from "@/services/flagsmith";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "./ui/alert-dialog";
import { Button } from "./ui/button";
import { Skeleton } from "./ui/skeleton";

function CheckInPrompt() {
  const [checkingIn, setCheckingIn] = useState(false);
  const device = useDeviceMeta();
  const selfCheckIn = useSelfCheckIn();

  const handleCheckIn = async () => {
    setCheckingIn(true);
    try {
      const visitorId =
        device.status === "success" ? device.data?.visitorId : undefined;
      const browser =
        device.status === "success" ? device.data?.browser : undefined;
      await selfCheckIn({ method: "one-tap", visitorId, browser });
      toast.success("Checked in successfully!");
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setCheckingIn(false);
    }
  };

  return (
    <div className="border overflow-hidden rounded-lg bg-background dark:bg-gray-950">
      <div className="p-4 flex flex-col gap-4">
        <div className="flex items-start gap-4">
          <div className="h-8 aspect-square shrink-0 flex justify-center items-center text-muted-foreground">
            <InfoIcon className="h-5 w-5" />
          </div>

          <div className="flex-1">
            <p className="font-semibold text-base tracking-tight">
              Check In for today
            </p>
            <p className="text-xs text-muted-foreground font-medium mt-1">
              Tap the button below or scan the QR code at the entrance to check
              in.
            </p>
          </div>
        </div>

        <Button
          className="w-full"
          onClick={handleCheckIn}
          disabled={checkingIn}
        >
          {checkingIn ? (
            <>
              <LucideLoader className="mr-2 h-4 w-4 animate-spin" />
              Checking in...
            </>
          ) : (
            "Check In"
          )}
        </Button>
      </div>
    </div>
  );
}

function CheckOutEntry({
  entry,
}: {
  entry: NonNullable<ReturnType<typeof useTodaysRegistration>>;
}) {
  const [checkingOut, setCheckingOut] = useState(false);
  const selfCheckOut = useSelfCheckOut();

  const handleCheckOut = async () => {
    setCheckingOut(true);
    try {
      await selfCheckOut();
      toast.success("Checked out successfully!");
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setCheckingOut(false);
    }
  };

  const button = (
    <AlertDialogTrigger asChild>
      <Button variant="default" className="w-full" disabled={checkingOut}>
        {checkingOut ? (
          <>
            <LucideLoader className="h-4 w-4 animate-spin" />
            Checking out...
          </>
        ) : (
          <>
            <LogOut className="h-4 w-4" />
            Check Out
          </>
        )}
      </Button>
    </AlertDialogTrigger>
  );

  return (
    <AlertDialog>
      <div className="border overflow-hidden rounded-lg bg-background dark:bg-gray-950">
        <div className="p-4 flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="h-6 w-6 text-green-500 shrink-0" />

            <div className="flex-1">
              <p className="font-semibold text-base tracking-tight">
                You&apos;re checked in
              </p>
              <p className="text-xs text-muted-foreground font-medium">
                Since {formatTime(entry.timestamp)}
              </p>
            </div>

            <div className="hidden sm:inline-flex">{button}</div>
          </div>

          <div className="sm:hidden">{button}</div>
        </div>
      </div>

      <AlertDialogContent className="max-w-sm!">
        <AlertDialogHeader>
          <AlertDialogTitle>Confirm Check Out</AlertDialogTitle>
        </AlertDialogHeader>

        <p className="text-sm text-foreground text-pretty">
          Are you sure you want to check out? You're only required to do this
          when you've closed for the day.
          <br />
          <br />
          You checked in at{" "}
          <span className="font-semibold">{formatTime(entry.timestamp)}.</span>
        </p>

        <AlertDialogFooter className="mt-8">
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction disabled={checkingOut} onClick={handleCheckOut}>
            {checkingOut ? "Checking out..." : "Yes, Check Out"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function SessionSummary({
  entry,
}: {
  entry: NonNullable<ReturnType<typeof useTodaysRegistration>> & {
    checkedout_at: string;
  };
}) {
  const todaysRating = useTodaysRating();

  return (
    <div className="border overflow-hidden rounded-lg bg-background dark:bg-gray-950">
      <div className="p-4">
        <div className="flex items-center gap-3">
          <CheckCircle2 className="h-6 w-6 text-green-500 shrink-0" />
          <div>
            <p className="font-semibold text-base tracking-tight">
              Thanks for coming
            </p>
            <p className="text-xs text-muted-foreground font-medium">
              {formatTime(entry.timestamp)} → {formatTime(entry.checkedout_at)}
            </p>
            <p className="text-xs text-muted-foreground font-medium">
              Duration: {formatDuration(entry.timestamp, entry.checkedout_at)}
            </p>
          </div>
        </div>
      </div>

      {!todaysRating && <RateExperience />}
    </div>
  );
}

function RateExperience() {
  const [score, setScore] = useState(0);
  const [hovered, setHovered] = useState(0);
  const [selectedPresets, setSelectedPresets] = useState<string[]>([]);
  const [comment, setComment] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const submitRating = useMutation(api.selfService.submitRating);

  const presets = [
    "Terrible Internet",
    "Electricity troubles",
    "Uncomfortable chair",
    "Noisy",
    "Impolite managers",
  ];

  const togglePreset = (preset: string) => {
    setSelectedPresets((prev) =>
      prev.includes(preset)
        ? prev.filter((p) => p !== preset)
        : [...prev, preset],
    );
  };

  const handleSubmit = async () => {
    if (score === 0) return;
    setSubmitting(true);
    try {
      await submitRating({
        score,
        presets: selectedPresets,
        comment: comment || undefined,
      });
      setSubmitted(true);
      toast.success("We've received your review. Thank you");
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return null;
  }

  return (
    <div className="overflow-hidden">
      <div className="p-4 flex flex-col gap-4">
        <div className="p-4 flex flex-col gap-4 bg-gray-50 shadow-inner rounded-[10px] border border-gray-200">
          <p className="font-semibold text-sm text-center tracking-tight">
            How was your experience today?
          </p>

          <div className="flex gap-1 justify-center py-4">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                className="transition-colors"
                onMouseEnter={() => setHovered(star)}
                onMouseLeave={() => setHovered(0)}
                onClick={() => setScore(star)}
              >
                <Star
                  className="h-6 w-6"
                  fill={star <= (hovered || score) ? "#f59e0b" : "transparent"}
                  color={star <= (hovered || score) ? "#f59e0b" : "#d1d5db"}
                />
              </button>
            ))}
          </div>

          {score > 0 && score < 5 && (
            <div className="flex flex-wrap gap-2 justify-center">
              {presets.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => togglePreset(preset)}
                  className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                    selectedPresets.includes(preset)
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-background text-foreground border-border hover:border-foreground"
                  }`}
                >
                  {preset}
                </button>
              ))}
            </div>
          )}

          {score > 0 && score < 5 && selectedPresets.length > 0 && (
            <textarea
              placeholder="Tell us more... (optional)"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={3}
              className="w-full text-sm rounded-md border border-input bg-background px-3 py-2 resize-none"
            />
          )}
        </div>

        <Button onClick={handleSubmit} disabled={score === 0 || submitting}>
          {submitting ? "Submitting..." : "Submit"}
        </Button>
      </div>
    </div>
  );
}

export function SelfCheckInStatus() {
  const flags = useFlags(["customer_scanning"]);
  const registration = useTodaysRegistration();

  if (!flags?.customer_scanning?.enabled) return null;

  if (registration === undefined) {
    return <Skeleton className="h-20 rounded-lg border" />;
  }

  if (registration?.checkedout_at) {
    return (
      <SessionSummary
        entry={
          registration as NonNullable<typeof registration> & {
            checkedout_at: string;
          }
        }
      />
    );
  }

  if (FlagsCustomerScan.allow_one_tap(flags.customer_scanning)) {
    if (isNullable(registration)) {
      return <CheckInPrompt />;
    }
  }

  if (registration) {
    return <CheckOutEntry entry={registration} />;
  }

  return null;
}

function CustomerWillScanQR() {
  const button = <Button className="w-full">Check In</Button>;

  return (
    <div className="border border-[red]/50 select-none overflow-hidden rounded-lg shadow-lg bg-background dark:bg-gray-950">
      <div className="p-4 flex flex-col gap-4">
        <div className="flex justify-between w-full gap-4 items-center">
          <div className="h-8 items-center aspect-square shrink-0 flex justify-center text-muted-foreground">
            <InfoIcon className="" />
          </div>

          <div className="flex flex-col items-start flex-1 gap-1">
            <p className="tracking-tight text-foreground text-base font-semibold">
              Check In for today
            </p>
            <p className="text-pretty text-muted-foreground font-medium text-xs">
              It&apos;s important we keep track of your daily attendance for
              security reasons.
            </p>
          </div>

          <div className="hidden sm:flex">{button}</div>
        </div>

        <div className="sm:hidden mt-4 flex justify-end">{button}</div>
      </div>
    </div>
  );
}
