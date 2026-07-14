"use client"
import { usePathname } from "next/navigation";
import { useAuthEvents } from "@/hooks/auth";

export function AuthChecker() {
  "use memo"
  const pathname = usePathname();

  useAuthEvents({
    onChange(event) {
      if (pathname === "/onboarding") {
        return;
      }

      if (event.authState === "logged_in") return null;

      if (event.syncState !== "syncing" || event.onboarding === "pending") {
        return window.location.replace("/onboarding");
      }
    }
  });

  return null;
}
