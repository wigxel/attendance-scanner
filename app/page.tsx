"use client";
import { useQuery } from "convex/react";
import type React from "react";
import { AttendanceCalendar } from "@/components/AttendanceCalendar";
import { useReadProfile } from "@/hooks/auth";
import { api } from "@/convex/_generated/api";
import { CheckInCard } from "@/components/CheckInCard";
import { Header } from "../components/header";
import { Footer } from "@/components/footer";
import { Button } from "@/components/ui/button";
import { SuggestionsFAB, VotingSection } from "@/components/feedbacks";
import { If } from "@/components/if";
import Link from "next/link";
import { ArrowRightIcon, Calendar, Clock, Users } from "lucide-react";

function greet_time(): string {
  const date = new Date();
  const hour = date.getHours();

  if (hour < 12) return "Good morning ☀️";
  if (hour < 18) return "Good afternoon 🌤️";

  return "Good evening 🌙";
}

function Content() {
  const profile = useReadProfile();

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

          <If cond={profile?.role === "admin"}>
            <Link
              href="/admin"
              className="items-center text-sm font-semibold inline-flex self-start"
            >
              <span>Goto Admin</span>
              <ArrowRightIcon size="1em" />
            </Link>
          </If>
        </div>

        <NotRegistered>
          <CheckInCard />
        </NotRegistered>

        <AttendanceCalendar />

        <ActiveBookings />

        <Link href="/reserve?tab=booking" className="self-center">
          <Button variant="outline" className="self-center cursor-pointer">
            Reserve Seat
          </Button>
        </Link>

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

function NotRegistered({ children }: { children: React.ReactNode }) {
  const is_registered = useQuery(api.myFunctions.isRegisteredForToday);

  if (is_registered === undefined) return null;

  if (is_registered) return null;

  return <div>{children}</div>;
}

function ActiveBookings() {
  const bookings = useQuery(api.bookings.getUserConfirmedBookings);

  if (bookings === undefined) {
    return (
      <div className="bg-white border border-solid border-gray-200 py-6 flex flex-col gap-2 rounded-2xl">
        <h3 className="text-xl font-medium pb-3 px-6 border-b border-solid">
          Bookings
        </h3>
        <div className="px-6 py-8 text-center">
          <div className="animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-3/4 mx-auto mb-2"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2 mx-auto"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!bookings || bookings.length === 0) {
    return (
      <div className="bg-white border border-solid border-gray-200 py-6 flex flex-col gap-2 rounded-2xl">
        <h3 className="text-xl font-medium pb-3 px-6 border-b border-solid">
          Bookings
        </h3>
        <div className="px-6 py-8 text-center">
          <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600 mb-2">No bookings found</p>
          <p className="text-sm text-gray-500">
            Your bookings will appear here once you make a reservation.
          </p>
        </div>
      </div>
    );
  }

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
  };

  const getDurationText = (durationType: string): string => {
    return durationType.charAt(0).toUpperCase() + durationType.slice(1);
  };

  return (
    <div className="bg-white border border-solid border-[#e5e7eb] py-6 flex flex-col gap-2 rounded-2xl">
      <div className="flex items-center justify-between px-6 pb-3 border-b border-solid">
        <h3 className="text-xl font-medium">Active Bookings</h3>
        <span className="text-sm text-gray-500">{bookings.length} active</span>
      </div>

      <div className="px-6 py-3 flex flex-col gap-3 max-h-80 overflow-y-auto">
        {bookings.map((booking) => (
          <div
            key={booking._id}
            className="py-4 border-b border-gray-100 last:border-0 flex flex-col gap-3"
          >
            <div className="group flex flex-col md:flex-row sm:flex-row sm:items-center justify-between gap-4 sm:gap-0">
              {/* LEFT: Date and Time */}
              <div className="flex items-center gap-3 min-w-[180px]">
                {/* Calendar Box */}
                <div className="flex flex-col items-center justify-center w-12 h-12 bg-gray-100 rounded-lg shrink-0 border border-gray-200">
                  <span className="text-[10px] font-bold text-gray-500 uppercase">
                    {new Date(booking.startDate).toLocaleString("default", {
                      month: "short",
                    })}
                  </span>
                  <span className="text-lg font-bold text-gray-900 leading-none">
                    {new Date(booking.startDate).getDate()}
                  </span>
                </div>

                {/* Date/Time Text Info */}
                <div className="flex flex-col">
                  {booking.durationType === "day" ? (
                    <div className="flex items-center gap-2 text-sm font-medium text-gray-900">
                      <Clock className="w-3.5 h-3.5 text-gray-400" />
                      <p>09:00 AM - 05:00 PM</p>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-sm font-medium text-gray-900">
                      <Calendar className="w-3.5 h-3.5 text-gray-400" />
                      {/*if not a day booking, show the date range*/}
                      <span>
                        {formatDate(booking.startDate)} -{" "}
                        {formatDate(booking.endDate)}
                      </span>
                    </div>
                  )}
                  <span className="text-xs text-gray-500">
                    {getDurationText(booking.durationType)}
                  </span>
                </div>
              </div>

              {/* RIGHT: Action Button / Status Badge */}
              <div className="flex items-center md:justify-end sm:min-w-[140px]">
                {booking.role === "purchaser" && booking.seats.length > 1 ? (
                  // Purchaser with multiple seats: Share Button
                  <Link
                    href={`/share/${booking._id}`}
                    className="flex items-center gap-2 px-3 py-1.5 bg-black hover:bg-gray-800 text-white text-xs font-medium rounded-full transition-all shadow-sm hover:shadow"
                  >
                    <Users className="w-3 h-3" />
                    <span>Manage Group</span>
                  </Link>
                ) : booking.role === "guest" ? (
                  // Guest: Guest Badge
                  <div className="flex items-center gap-1 text-xs font-medium text-gray-600 bg-gray-100 px-2 py-1 rounded-full">
                    <span className="w-1.5 h-1.5 rounded-full bg-gray-500" />
                    Guest
                  </div>
                ) : (
                  // Purchaser with single seat: Confirmed Badge
                  <div className="flex items-center gap-1 text-xs font-medium text-[#0000FF] bg-blue-50 px-2 py-1 rounded-full">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#0000FF]" />
                    Confirmed
                  </div>
                )}
              </div>
            </div>

            {/* Seat Numbers */}
            <div className="flex flex-col gap-1 justify-between">
              <span className="text-[10px] uppercase tracking-wider font-semibold text-gray-400 mb-1">
                {booking.seats.length > 1 ? "Seats Reserved" : "Seat Number"}
              </span>
              <div className="flex flex-wrap items-center gap-1.5">
                {booking.seats?.map((seat, index) => (
                  <span
                    key={index}
                    className="text-sm font-mono font-medium px-2 py-0.5 rounded bg-gray-100 text-gray-700 border border-gray-200"
                  >
                    {seat?.seatNumber}
                  </span>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function Home() {
  return (
    <>
      <title>Customer Account | InSpace</title>
      <div className="fixed inset-0 z-0 scanline-container pointer-events-none" />
      <div className="z-[2] relative">
        <Header />

        <main className="px-4">
          <Content />
        </main>

        <Footer />
      </div>
    </>
  );
}
