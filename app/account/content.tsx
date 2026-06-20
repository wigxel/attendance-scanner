"use client";
import type { ReactNode } from "react";
import { SelfCheckInStatus } from "@/components/self-checkin-status";
import { AttendanceCalendar } from "@/components/AttendanceCalendar";
import { CheckInCard, NotRegistered } from "@/components/CheckInCard";
import { SuggestionsFAB, VotingSection } from "@/components/feedbacks";
import { useProfile } from "@/hooks/auth";
import { ActiveBookings } from "./active-bookings";

function greet_time(): string {
  const date = new Date();
  const hour = date.getHours();

  if (hour < 12) return "Good morning ☀️";
  if (hour < 18) return "Good afternoon 🌤️";

  return "Good evening 🌙";
}

export function Content({ gotoAdmin }: { gotoAdmin?: ReactNode }) {
  const { data: profile } = useProfile();

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

        <div className="flex gap-2 py-4 scanline-root justify-center *:rounded-full *:aspect-square *:w-2 *:bg-gray-500">
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
