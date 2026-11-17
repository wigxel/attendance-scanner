"use client";

import { ListFilter } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

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
        <button
          type="button"
          aria-label={active ? "Filter is active" : "Filter"}
          className={cn(
            "inline-flex cursor-pointer items-center rounded-sm p-0.5 text-muted-foreground hover:text-foreground",
            active && "text-primary hover:text-primary",
          )}
        >
          <ListFilter className="h-3.5 w-3.5" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        <DropdownMenuItem onSelect={() => onChange(undefined)}>
          All
        </DropdownMenuItem>
        {options.map((option) => (
          <DropdownMenuItem
            key={option.value}
            onSelect={() => onChange(option.value)}
          >
            {option.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
