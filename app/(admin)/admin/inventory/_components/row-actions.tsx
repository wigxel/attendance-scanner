"use client";

import { MoreVertical } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export type RowAction = {
  icon: ReactNode;
  label: string;
  onSelect: () => void;
};

type RowActionsProps = {
  rowLabel: string;
  actions: RowAction[];
};

/** A row's actions collapsed into one end-aligned ⋮ dropdown. */
export function RowActions({ rowLabel, actions }: RowActionsProps) {
  return (
    <div className="flex justify-end">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            aria-label={`Actions for ${rowLabel}`}
          >
            <MoreVertical className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {actions.map((action) => (
            <DropdownMenuItem key={action.label} onClick={action.onSelect}>
              {action.icon} {action.label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
