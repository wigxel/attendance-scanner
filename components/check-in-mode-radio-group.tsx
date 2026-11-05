"use client";

import type { CheckInMode } from "@/convex/shared";
import { cn } from "@/lib/utils";
import { CHECK_IN_MODE_LABELS } from "./check-in-mode-select";
import { Label } from "./ui/label";
import { RadioGroup, RadioGroupItem } from "./ui/radio-group";

const DESCRIPTIONS: Record<CheckInMode, string> = {
  one_tap: "The customer taps 'Check In' on their account page.",
  self_checkin: "The customer scans the entrance QR code themselves.",
  staff_scan: "Staff scan the customer's QR code at the counter.",
};

const MODES: CheckInMode[] = ["self_checkin", "staff_scan", "one_tap"];

type CheckInModeRadioGroupProps = {
  value: CheckInMode;
  onChange: (mode: CheckInMode) => void;
  disabled?: boolean;
  className?: string;
};

export function CheckInModeRadioGroup({
  value,
  onChange,
  disabled = false,
  className,
}: CheckInModeRadioGroupProps) {
  return (
    <RadioGroup
      value={value}
      onValueChange={(next) => onChange(next as CheckInMode)}
      disabled={disabled}
      aria-label="Default check-in mode"
      className={cn("@lg:grid-cols-2", className)}
    >
      {MODES.map((mode) => {
        const isSelected = mode === value;
        const isLast = mode === MODES[MODES.length - 1];

        return (
          <Label
            key={mode}
            htmlFor={`check-in-mode-${mode}`}
            className={cn(
              "flex items-start gap-3 min-h-32 rounded-xl border p-4 transition-colors",
              isSelected
                ? "border-primary bg-accent"
                : "border-border bg-background",
              !disabled && !isSelected && "hover:bg-accent/50",
              disabled && "cursor-not-allowed",
              isLast && "@lg:col-span-2",
            )}
          >
            <RadioGroupItem
              id={`check-in-mode-${mode}`}
              value={mode}
              className="mt-0.5"
            />
            <span className="flex flex-col gap-1">
              <span className="text-sm font-medium">
                {CHECK_IN_MODE_LABELS[mode]}
              </span>
              <span className="text-sm text-muted-foreground">
                {DESCRIPTIONS[mode]}
              </span>
            </span>
          </Label>
        );
      })}
    </RadioGroup>
  );
}
