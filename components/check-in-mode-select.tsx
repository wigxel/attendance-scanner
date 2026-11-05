"use client";
import type { CheckInMode } from "@/convex/shared";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";

export const CHECK_IN_MODE_LABELS: Record<CheckInMode | "auto", string> = {
  auto: "Auto",
  one_tap: "One-tap",
  self_checkin: "Self check-in",
  staff_scan: "Staff scan",
};

type SelectableMode = CheckInMode | "auto";

export function CheckInModeSelect({
  value,
  onChange,
  allowAuto = false,
  disabled = false,
  className = "w-[180px]",
}: {
  value: SelectableMode;
  onChange: (mode: SelectableMode) => void;
  allowAuto?: boolean;
  disabled?: boolean;
  className?: string;
}) {
  const modes: SelectableMode[] = allowAuto
    ? ["auto", "one_tap", "self_checkin", "staff_scan"]
    : ["one_tap", "self_checkin", "staff_scan"];

  return (
    <Select
      value={value}
      onValueChange={(next) => onChange(next as SelectableMode)}
      disabled={disabled}
    >
      <SelectTrigger className={className}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {modes.map((mode) => (
          <SelectItem key={mode} value={mode}>
            {CHECK_IN_MODE_LABELS[mode]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
