"use client";

import { useQuery } from "convex/react";
import { Check, ChevronsUpDown, UserCheck } from "lucide-react";
import React from "react";
import { AppSpinner } from "@/components/loader";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { api } from "@/convex/_generated/api";
import { cn } from "@/lib/utils";

interface CustomerComboboxProps {
  value: string;
  onChange: (userId: string) => void;
  disabled?: boolean;
  readOnly?: boolean;
}

export function CustomerCombobox({
  value,
  onChange,
  disabled = false,
  readOnly = false,
}: CustomerComboboxProps) {
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState("");

  const preselectedUser = useQuery(
    api.myFunctions.getUserById,
    readOnly && value ? { userId: value } : "skip",
  );

  const customers = useQuery(api.myFunctions.getAllUsers, {
    paginationOpts: { numItems: 100, cursor: null },
    search: search || undefined,
  });

  const selectedName = React.useMemo(() => {
    if (preselectedUser) {
      return `${preselectedUser.firstName ?? ""} ${preselectedUser.lastName ?? ""}`.trim();
    }
    if (value && customers?.page) {
      const c = customers.page.find((u) => u.userId === value);
      if (c) return `${c.firstName} ${c.lastName}`;
    }
    return null;
  }, [preselectedUser, value, customers]);

  if (readOnly) {
    return (
      <Input
        value={selectedName ?? "Loading..."}
        disabled
        className="bg-background"
      />
    );
  }

  return (
    <div>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            aria-expanded={open}
            disabled={disabled}
            className="w-full justify-between font-normal"
          >
            {value && selectedName ? (
              <span className="flex items-center gap-2">
                <UserCheck className="h-4 w-4 text-muted-foreground" />
                {selectedName}
              </span>
            ) : (
              <span className="text-muted-foreground">Select customer...</span>
            )}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0">
          <Command shouldFilter={false}>
            <CommandInput
              placeholder="Search customers..."
              value={search}
              onValueChange={setSearch}
            />
            <CommandList>
              <CommandEmpty>
                {customers === undefined ? (
                  <span className="flex items-center justify-center gap-2">
                    <AppSpinner />
                    Loading...
                  </span>
                ) : (
                  "No customer found."
                )}
              </CommandEmpty>
              <CommandGroup>
                {customers?.page?.map((customer) => (
                  <CommandItem
                    key={customer.userId}
                    value={customer.userId}
                    onSelect={(currentValue) => {
                      onChange(currentValue);
                      setOpen(false);
                      setSearch("");
                    }}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        value === customer.userId ? "opacity-100" : "opacity-0",
                      )}
                    />
                    {customer.firstName} {customer.lastName}
                    <span className="ml-auto text-xs text-muted-foreground">
                      {customer.email}
                    </span>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}
