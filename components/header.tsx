"use client";
import {
  SignedIn,
  SignedOut,
  SignInButton,
  SignUpButton,
  UserButton,
} from "@clerk/nextjs";
import Link from "next/link";
import { Logo } from "@/components/logo";
import { useProfile } from "@/hooks/auth";

export function Header() {
  const { data: profile } = useProfile();

  return (
    <header className="sticky top-0 z-30 p-4 gap-4 dark:border-slate-800 flex flex-row justify-between items-center bg-background">
      <div className="absolute inset-0 z-0 scanline-container pointer-events-none" />
      <Logo className="w-[7rem] md:w-[9rem]" />

      <div className="flex gap-4 items-center">
        <nav>
          <li className="flex items-center">
            <Link href="/account" className="text-foreground hover:underline">
              Account
            </Link>
          </li>
        </nav>

        <div className="flex gap-3 items-center">
          <span>{profile?.firstName}</span>
          <SignedOut>
            <SignInButton />
            <SignUpButton>
              <button
                type="button"
                className="bg-(--primary) text-foreground rounded-full font-medium text-sm sm:text-base h-10 sm:h-12 px-4 sm:px-5 cursor-pointer"
              >
                Sign Up
              </button>
            </SignUpButton>
          </SignedOut>
          <SignedIn>
            <UserButton />
          </SignedIn>
        </div>
      </div>
    </header>
  );
}

export function PublicHeader() {
  return (
    <header className="sticky top-0 bg-background/[0.16] backdrop-blur-xs z-10 p-4 dark:border-slate-800 flex flex-row justify-between items-center">
      <Logo className="w-[7rem] md:w-[9rem]" />
    </header>
  );
}
