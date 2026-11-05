"use client";
import { useMutation } from "convex/react";
import { toast } from "sonner";
import { CheckInModeSelect } from "@/components/check-in-mode-select";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/convex/_generated/api";
import type { CheckInMode } from "@/convex/shared";
import { useDefaultCheckInMode } from "@/hooks/flags";
import { getErrorMessage } from "@/lib/error.helpers";

export function CheckInModeSettings() {
  const mode = useDefaultCheckInMode();
  const setDefault = useMutation(api.flags.setCheckInModeDefault);

  const handleChange = async (next: CheckInMode | "auto") => {
    if (next === "auto") return;

    try {
      await setDefault({ mode: next });
      toast.success("Default check-in mode updated");
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  return (
    <div className="max-w-xl">
      <h2 className="text-xl font-semibold tracking-tight">
        Default check-in mode
      </h2>
      <p className="text-sm text-muted-foreground mt-1 mb-4 text-pretty">
        Customers with no mode of their own use this. Staff can always check
        anyone in from the attendance page.
      </p>

      {mode === undefined ? (
        <Skeleton className="h-9 w-[180px]" />
      ) : (
        <CheckInModeSelect value={mode} onChange={handleChange} />
      )}
    </div>
  );
}
