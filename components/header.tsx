"use client";

import { Logo } from "@/components/logo";
import { useReadProfile } from "@/hooks/auth";
import {
  SignedOut,
  SignInButton,
  SignUpButton,
  SignedIn,
  UserButton,
} from "@clerk/nextjs";

export function Header() {
  const profile = useReadProfile();

  return (
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
  );
}

export function PublicHeader() {
  return (
    <header className="sticky top-0 bg-white/[0.16] backdrop-blur-xs z-10 p-4 dark:border-slate-800 flex flex-row justify-between items-center">
      <Logo className="w-[7rem] md:w-[9rem]" />
    </header>
  );
}
