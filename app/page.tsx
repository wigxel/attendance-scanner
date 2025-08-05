"use client";
import { useQuery } from "convex/react";
import type React from "react";
import { AttendanceCalendar } from "@/components/AttendanceCalendar";
import { useReadProfile } from "@/hooks/auth";
import { api } from "@/convex/_generated/api";
import { CheckInCard } from "@/components/CheckInCard";
import { Header } from "../components/header";
import { Footer } from "@/components/footer";
import { SuggestionsFAB, VotingSection } from "@/components/feedbacks";
import { If } from "@/components/if";
import Link from "next/link";
import { ArrowRightIcon } from "lucide-react";

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
