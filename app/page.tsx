"use client";
import { useQuery } from "convex/react";
import type React from "react";
import { FeatureRequestDialog } from "@/components/FeatureRequestDialog";
import { AttendanceCalendar } from "@/components/AttendanceCalendar";
import { useReadProfile } from "@/hooks/auth";
import { api } from "@/convex/_generated/api";
import { CheckInCard } from "@/components/CheckInCard";
import { useRouter } from "next/navigation";
import { Header } from "../components/header";
import { Footer } from "@/components/footer";

function greet_time(): string {
  const date = new Date();
  const hour = date.getHours();

  if (hour < 12) return "Good morning ☀️";
  if (hour < 18) return "Good afternoon 🌤️";

  return "Good evening 🌙";
}

function Content() {
  const profile = useReadProfile();
  const router = useRouter();

  if (profile?.role === 'admin') {
    router.push('/admin')
  }

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

        <div className="border shadow-inner bg-background relative flex flex-col rounded-2xl p-4 gap-4">
          <div className="flex flex-col gap-[0.5rem]">
            <h1 className="text-lg font-semibold text-start">
              What&apos;s coming next?
            </h1>

            <p className="text-base text-balance text-muted-foreground">
              You might just inspire us to add something you need.
              Don&apos;t hesitate to share your awesome ideas.
            </p>
            <div className="mt-2" />
          </div>

          <div className="-mx-2 -mb-2 flex flex-col">
            <FeatureRequestDialog />
          </div>
        </div>
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
