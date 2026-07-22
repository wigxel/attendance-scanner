"use client";
import type { ReactNode } from "react";
import { toast } from "sonner";
import { AttendanceCalendar } from "@/components/AttendanceCalendar";
import { CheckInCard, NotRegistered } from "@/components/CheckInCard";
import { SuggestionsFAB, VotingSection } from "@/components/feedbacks";
import { SelfCheckInStatus } from "@/components/self-checkin-status";
import { useProfile } from "@/hooks/auth";
import { usePendingCheckIn } from "@/hooks/pending-checkin";
import { useSelfCheckIn } from "@/hooks/self-service";
import { getErrorMessage } from "@/lib/error.helpers";
import { ActiveBookings } from "./active-bookings";

function greet_time(): string {
  const date = new Date();
  const hour = date.getHours();

  if (hour < 12) return "Good morning ☀️";
  if (hour < 18) return "Good afternoon 🌤️";

  return "Good evening 🌙";
}

export function Content({ gotoAdmin }: { gotoAdmin?: ReactNode }) {
  const { data: profile, isSignedIn } = useProfile();
  const selfCheckIn = useSelfCheckIn();

  // Only process a pending QR check-in once the profile is fully set up
  // (onboarding complete). This prevents the check-in from firing and
  // failing before the user has finished onboarding.
  const isProfileReady = !!profile && profile.occupation !== "None";

  usePendingCheckIn({
    isSignedIn: !!isSignedIn && isProfileReady,
    selfCheckIn,
    onSuccess: () => toast.success("Checked in"),
    onError: (err) => {
      const msg = getErrorMessage(err).toLowerCase();
      if (!msg.includes("already registered")) {
        toast.error(`Auto check-in failed: ${getErrorMessage(err)}`);
      }
    },
  });

  return (
    <div className="flex flex-col scanline-root max-w-lg mx-auto pt-6 pb-14">
      <section className="min-h-screen gap-[1.6rem] flex flex-col">
        <div className="flex flex-col gap-1">
          <h1>
            <span className="flex text-sm lg:text-base">{greet_time()}</span>
            <span className="text-2xl lg:text-4xl font-sans tracking-[-1.5px] font-semibold">
              {profile?.role !== "admin" ? (
                <>
                  {profile?.firstName} {profile?.lastName}
                </>
              ) : (
                "Administrator"
              )}
            </span>
          </h1>

          {gotoAdmin}
        </div>

        <SelfCheckInStatus />

        <NotRegistered>
          <CheckInCard />
        </NotRegistered>

        <ActiveBookings />

        <AttendanceCalendar />

        <div className="flex gap-2 py-4 scanline-root justify-center *:rounded-full *:aspect-square *:w-2 *:bg-background0">
          <span />
          <span />
          <span />
        </div>

        <VotingSection />

        <SuggestionsFAB />
      </section>
    </div>
  );
}
