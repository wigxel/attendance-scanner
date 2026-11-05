"use client";
import { useMutation } from "convex/react";
import { useState } from "react";
import { toast } from "sonner";
import { CheckInModeRadioGroup } from "@/components/check-in-mode-radio-group";
import { BackgroundActivityIndicator } from "@/components/loader";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/convex/_generated/api";
import type { CheckInMode } from "@/convex/shared";
import { useDefaultCheckInMode } from "@/hooks/flags";
import { getErrorMessage } from "@/lib/error.helpers";
import { cn } from "@/lib/utils";

// Mirrors the three-card grid so the tab does not jump when the mode loads.
const SKELETON_CARDS = [0, 1, 2] as const;

export function CheckInModeSettings() {
  const mode = useDefaultCheckInMode();
  const setDefault = useMutation(api.flags.setCheckInModeDefault);
  const [optimistic, setOptimistic] = useState<{
    from: CheckInMode;
    to: CheckInMode;
  } | null>(null);

  // Derived, not stored: once the query reports the new mode the optimistic
  // pair no longer matches and the real value takes over — no effect needed.
  const pending = optimistic && mode === optimistic.from ? optimistic : null;
  const isSaving = pending !== null;
  const selectedMode = pending?.to ?? mode;

  const handleChange = async (next: CheckInMode) => {
    if (!mode || next === mode) return;

    setOptimistic({ from: mode, to: next });

    try {
      await setDefault({ mode: next });
      toast.success("Default check-in mode updated");
    } catch (err) {
      setOptimistic(null);
      toast.error(getErrorMessage(err));
    }
  };

  return (
    <div className="@container relative">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">
            Global Check-in mode
          </h2>
          <p className="text-sm text-muted-foreground max-w-sm mt-1 text-pretty">
            Customers with no mode of their own use this. Staff can always check
            anyone in from the attendance page.
          </p>
        </div>

        {isSaving ? (
          <BackgroundActivityIndicator
            className={"-top-4 -inset-e-4 absolute "}
          />
        ) : null}
      </div>

      <div className="mt-4">
        {selectedMode === undefined ? (
          <CheckInModeSkeleton />
        ) : (
          <CheckInModeRadioGroup
            value={selectedMode}
            onChange={handleChange}
            disabled={isSaving}
            className={cn(isSaving && "opacity-60")}
          />
        )}
      </div>
    </div>
  );
}

function CheckInModeSkeleton() {
  return (
    <div className="grid gap-3 @lg:grid-cols-2" aria-hidden>
      {SKELETON_CARDS.map((card) => (
        <Skeleton
          key={card}
          className={cn(
            "aspect-[3/1.6] rounded-xl",
            card === SKELETON_CARDS.length - 1 && "@lg:col-span-2",
          )}
        />
      ))}
    </div>
  );
}
