"use client";
import type { ReactNode } from "react";
import { toast } from "sonner";
import { AttendanceCalendar } from "@/components/AttendanceCalendar";
import { BirthdayPrompt } from "@/components/BirthdayPrompt";
import {
  BirthdayCheckInConfetti,
  CheckedInConfirmation,
  CheckInCard,
  NotRegistered,
} from "@/components/CheckInCard";
import { SuggestionsFAB, VotingSection } from "@/components/feedbacks";
import { Greeting } from "@/components/greeting";
import { RoomEnvironmentWidget } from "@/components/room-environment-widget";
import { SelfCheckInStatus } from "@/components/self-checkin-status";
import { SelfCheckInMessages } from "@/convex/shared";
import { useProfile } from "@/hooks/auth";
import { usePendingCheckIn } from "@/hooks/pending-checkin";
import { useSelfCheckIn } from "@/hooks/self-service";
import { getErrorMessage } from "@/lib/error.helpers";
import { ActiveBookings } from "./active-bookings";
import { CommunityLinks } from "./community-links";
import { ExpiryWarning } from "./expiry-warning";
import { HappyBirthday } from "./happy-birthday";

interface ContentProps {
  gotoAdmin?: ReactNode;
}

export function Content({ gotoAdmin }: ContentProps) {
  const { data: profile, isSignedIn } = useProfile();
  const selfCheckIn = useSelfCheckIn();

  // Only process a pending QR check-in once the profile is fully set up
  // (onboarding complete). This prevents the check-in from firing and
  // failing before the user has finished onboarding.
  const isProfileReady =
    !!profile && profile.occupation !== "None" && !!profile.birthday;

  usePendingCheckIn({
    isSignedIn: !!isSignedIn && isProfileReady,
    selfCheckIn,
    onSuccess: () => toast.success("Checked in"),
    onError: (err) => {
      const message = getErrorMessage(err);

      // A refused check-in mode is guidance, not a failure: show the
      // actionable copy verbatim instead of "Auto check-in failed".
      if (Object.values(SelfCheckInMessages).includes(message)) {
        toast.info(message);
        return;
      }

      if (!message.toLowerCase().includes("already registered")) {
        toast.error(`Auto check-in failed: ${message}`);
      }
    },
  });

  return (
    <div className="flex flex-col scanline-root max-w-lg mx-auto pt-6 pb-14">
      <section className="min-h-screen gap-[1.6rem] flex flex-col">
        <div className="flex flex-col gap-1">
          <h1>
            <Greeting className="flex text-sm lg:text-base" />
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

        <BirthdayCheckInConfetti />

        <HappyBirthday />

        <ExpiryWarning />

        <BirthdayPrompt />

        <SelfCheckInStatus />

        <CheckedInConfirmation />

        <NotRegistered>
          <CheckInCard />
        </NotRegistered>

        {/* Lives outside NotRegistered: it must observe the registration flip. */}

        <ActiveBookings />

        <AttendanceCalendar />

        <RoomEnvironmentWidget />

        <CommunityLinks />

        <div className="flex gap-2 py-4 scanline-root justify-center *:rounded-full *:aspect-square *:w-2 *:bg-background">
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
