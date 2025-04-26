"use client";

import { useConvexAuth, useQuery } from "convex/react";
import { useAuthActions } from "@convex-dev/auth/react";
import { useRouter } from "next/navigation";
import { QRCodeSVG } from "qrcode.react";
import React from "react";
import cn from 'clsx';
import { Button } from "@/components/ui/button";
import { FeatureRequestDialog } from "@/components/FeatureRequestDialog";
import { AttendanceCalendar } from "@/components/AttendanceCalendar";
import { useProfile } from "@/hooks/auth";
import { api } from "@/convex/_generated/api";
import { Logo } from "@/components/logo";


function SignOutButton() {
  const { isAuthenticated } = useConvexAuth();
  const { signOut } = useAuthActions();
  const router = useRouter();

  return (
    <>
      {isAuthenticated && (
        <Button
          variant={'default'}
          onClick={() => {
            signOut().then(() => {
              router.push("/signin");
            })
          }}
        >
          Sign out
        </Button>
      )}
    </>
  );
}

function QRCode({ data }: { data: string }) {
  const [size, setSize] = React.useState<number | null>(null);
  const ref = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const abortController = new AbortController();

    if (ref.current) {
      setSize(ref.current.clientWidth);
    }

    window.addEventListener('resize', () => {
      if (ref.current) {
        setSize(ref.current.clientWidth);
      }
    }, {
      signal: abortController.signal
    });

    return () => {
      abortController.abort()
    };
  }, []);

  return (
    <div ref={ref} className="w-full aspect-square p-2">
      {size === null ? null :
        <QRCodeSVG
          size={size}
          fgColor={"#111"}
          value={data}
          className="px-4 rounded-lg shadow-lg border w-full"
        />}
    </div>
  );
}

function CheckInCard() {
  return <div className="border overflow-hidden rounded-2xl bg-background dark:bg-gray-950">

    <QRCode data={"302930924-helloman"} />

    <p className="p-4 text-center border-t font-mono text-xs">
      Present QR Code to Staff at Check-in Counter
    </p>
  </div>
}

function greet_time(): string {
  const date = new Date();
  const hour = date.getHours();

  if (hour < 12) return "Good morning ☀️";
  if (hour < 18) return "Good afternoon 🌤️";

  return "Good evening 🌙";
}


function Content() {
  const profile = useProfile();

  return (
    <div className="flex flex-col scanline-root max-w-lg mx-auto pt-6 pb-14">
      <section className="min-h-screen gap-[1.6rem] flex flex-col">
        <h1>
          <span className="flex text-xs lg:text-base">
            {greet_time()}
          </span>
          <span className="text-2xl lg:text-4xl font-sans tracking-[-1.5px] font-semibold">
            {profile?.firstName} {profile?.lastName}
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
            <h1 className="text-lg font-semibold text-start">What&apos;s coming next?</h1>

            <p className="text-base text-balance text-muted-foreground">You might just inspire us to add something you need. Don&apos;t hesitate to share your awesome ideas.</p>
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
  const is_attendance_taken = useQuery(api.myFunctions.isRegisteredForToday)

  if (is_attendance_taken === undefined) return null;

  if (is_attendance_taken) return null

  return <div>{children}</div>
}

export default function Home() {
  const profile = useProfile();

  return (
    <>
      <div className="fixed inset-0 z-0 scanline-container pointer-events-none" />
      <div className="z-[2] relative">
        <header className="sticky top-0 z-10 p-4 dark:border-slate-800 flex flex-row justify-between items-center">
          <Logo className="w-[7rem] md:w-[9rem]" />

          <div className="flex gap-3 items-center">
            <span>
              {profile?.firstName}
            </span>

            <SignOutButton />
          </div>
        </header>

        <main className="px-4">
          <Content />
        </main>

        <footer className="mt-4 p-4 text-xs border-t w-full text-center">
          Designed & Crafted 100% by{" "}
          <a className="underline" href="https://wigxel.io">Wigxel</a>
        </footer>
      </div>
    </>
  );
}
