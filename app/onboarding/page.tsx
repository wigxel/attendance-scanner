"use client";

import { useEffect } from "react";
import OnboardingForm from "@/components/OnboardingForm";
import { useRouter } from "next/navigation";
import { useReadProfile } from "@/hooks/auth";

export default function Onboarding() {
  const router = useRouter();
  const profile = useReadProfile()

  useEffect(() => {
    if (!profile) return;
    // If user already has a profile, redirect to home
    if (profile?.firstName) {
      router.push("/");
    }
  }, [profile, router]);

  return (
    <div className="flex flex-col gap-8 w-96 mx-auto h-screen justify-center items-center">
      <h1 className="text-2xl font-bold">Complete Your Profile</h1>
      <p className="text-center text-muted-foreground">Please provide the following information to complete your registration.</p>

      <OnboardingForm />
    </div>
  );
}
