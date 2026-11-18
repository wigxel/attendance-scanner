"use client";
import { Cake } from "lucide-react";
import { useEffect } from "react";
import { useProfile } from "@/hooks/auth";
import {
  fireBirthdayConfetti,
  isBirthdayToday,
  shouldCelebrate,
} from "@/lib/birthday";

/**
 * Birthday banner on the account screen. Renders nothing except on the
 * member's birthday, when it greets them and fires the once-a-day login
 * confetti (the check-in confetti is a separate trigger in CheckInCard).
 */
export function HappyBirthday() {
  const { data: profile } = useProfile();
  const birthday = profile?.birthday;

  useEffect(() => {
    if (!isBirthdayToday(birthday)) return;
    if (shouldCelebrate("login")) fireBirthdayConfetti();
  }, [birthday]);

  if (!isBirthdayToday(birthday)) return null;

  return (
    <section className="flex items-center gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4">
      <Cake className="h-8 w-8 shrink-0 text-amber-500" />
      <div>
        <p className="font-semibold">
          Happy birthday, {profile?.firstName}! 🎉
        </p>
        <p className="text-sm text-muted-foreground">
          Thank you for spending your birthday with us. A gift is waiting — you
          don&apos;t need to lift a finger.
        </p>
      </div>
    </section>
  );
}
