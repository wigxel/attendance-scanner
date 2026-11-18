"use client";

import { CheckIcon, ListFilter } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { Button } from "../ui/button";

type FilterDropdownProps<T extends string> = {
  value: T | undefined;
  options: readonly { value: T; label: string }[];
  onChange: (value: T | undefined) => void;
};

/**
 * A single-select filter that renders inside a column header: a funnel icon
 * next to the label, opening "All" plus one option per value. "All" clears
 * the filter (undefined); the icon is tinted while a filter is active.
 */
export function FilterDropdown<T extends string>({
  value,
  options,
  onChange,
}: FilterDropdownProps<T>) {
  const active = value !== undefined;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant={"ghost"}
          size="icon-xs"
          aria-label={active ? "Filter is active" : "Filter"}
          className={cn(
            "opacity-50",
            active && "text-primary opacity-100 hover:opacity-80 ",
          )}
        >
          <ListFilter className="h-3.5 w-3.5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        <DropdownMenuItem onSelect={() => onChange(undefined)}>
          <CheckIcon className={cn("invisible", !active && "visible")} />
          All
        </DropdownMenuItem>
        {options.map((option) => (
          <DropdownMenuItem
            key={option.value}
            onSelect={() => onChange(option.value)}
          >
            <CheckIcon
              className={cn("invisible", value === option.value && "visible")}
            />
            {option.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
