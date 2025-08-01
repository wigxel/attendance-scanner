"use client";
import { useQuery } from "convex/react";
import React from "react";
import { AttendanceCalendar } from "@/components/AttendanceCalendar";
import { useReadProfile } from "@/hooks/auth";
import { api } from "@/convex/_generated/api";
import { CheckInCard } from "@/components/CheckInCard";
import { useRouter } from "next/navigation";
import { Header } from "../components/header";
import { Footer } from "@/components/footer";
import { SuggestionsFAB, VotingSection } from "@/components/feedbacks";

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
        <h1>
          <span className="flex text-xs lg:text-base">{greet_time()}</span>
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
  const is_attendance_taken = useQuery(api.myFunctions.isRegisteredForToday);

  if (is_attendance_taken === undefined) return null;

  if (is_attendance_taken) return null;

  return <div>{children}</div>;
}

export default function Home() {
  const profile = useReadProfile();
  const router = useRouter();

  React.useMemo(() => {
    if (profile?.role === "admin") {
      router.push("/admin");
    }
  }, [router]);

  return (
    <>
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
