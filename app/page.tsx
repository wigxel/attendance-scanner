"use client";
import { useQuery } from "convex/react";
import type React from "react";
import { FeatureRequestDialog } from "@/components/FeatureRequestDialog";
import { AttendanceCalendar } from "@/components/AttendanceCalendar";
import { useReadProfile } from "@/hooks/auth";
import { api } from "@/convex/_generated/api";
import { Logo } from "@/components/logo";
import { CheckInCard } from "@/components/CheckInCard";
import { TakeAttendance } from "@/components/TakeAttendance";
<<<<<<< HEAD

function SignOutButton() {
  const router = useRouter();
  const { signOut } = useAuthActions();
  const { isAuthenticated } = useConvexAuth();

  return (
    <>
      {isAuthenticated && (
        <Button
          variant={"default"}
          onClick={() => {
            signOut().then(() => {
              router.push("/signin");
            });
          }}        >
          Sign out
        </Button>
      )}
    </>
  );
}
=======
import {
  SignedOut,
  SignInButton,
  SignUpButton,
  SignedIn,
  UserButton,
} from "@clerk/nextjs";
>>>>>>> 1ae61dc8a06031aecee77e389eb8e30e42a96885

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

        {profile?.role === "admin" ? (
          <TakeAttendance />
        ) : (
          <>
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
          </>
        )}
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

  return (
    <>
      <div className="fixed inset-0 z-0 scanline-container pointer-events-none" />
      <div className="z-[2] relative">
        <header className="sticky top-0 z-10 p-4 dark:border-slate-800 flex flex-row justify-between items-center">
          <Logo className="w-[7rem] md:w-[9rem]" />

          <div className="flex gap-3 items-center">
            <span>{profile?.firstName}</span>

            <SignedOut>
              <SignInButton />
              <SignUpButton>
                <button
                  type="button"
                  className="bg-[#6c47ff] text-white rounded-full font-medium text-sm sm:text-base h-10 sm:h-12 px-4 sm:px-5 cursor-pointer"
                >
                  Sign Up
                </button>
              </SignUpButton>
            </SignedOut>
            <SignedIn>
              <UserButton />
            </SignedIn>
          </div>
        </header>

        <main className="px-4">
          <Content />
        </main>

        <footer className="mt-4 p-4 text-xs border-t w-full text-center">
          Designed & Crafted 100% by{" "}
          <a className="underline" href="https://wigxel.io">
            Wigxel
          </a>
        </footer>
      </div>
    </>
  );
}
