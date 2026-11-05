"use client";

import { MinusIcon, PlusIcon } from "lucide-react";
import * as React from "react";
import useEvent from "react-use-event-hook";
import { useQuantity } from "@/hooks/use-quantity";
import {
  isAmountKey,
  parseAmountInput,
  sanitizeAmountInput,
} from "@/lib/money.helpers";
import { cn } from "@/lib/utils";
import { Button } from "./button";
import { Input } from "./input";

type CurrencyInputProps = Omit<
  React.ComponentProps<"input">,
  "onChange" | "type" | "value"
> & {
  value: string;
  onChange: (value: string) => void;
  /** Amount added or removed per stepper click. */
  step?: number;
};

export const CurrencyInput = React.forwardRef<
  HTMLInputElement,
  CurrencyInputProps
>(function CurrencyInput(
  { value, onChange, step = 1, className, ...props },
  ref,
) {
  // useEvent keeps the handler stable while reading the latest value, so a
  // press-and-hold walk stays in sync with the form.
  const onAdjust = useEvent((mutate: (value: number) => number) => {
    const next = Math.max(0, mutate(parseAmountInput(value)));
    onChange(String(Math.round(next * 100) / 100));
  });

  const [decrement, increment] = useQuantity({ onAdjust, step });

  return (
    <div className="flex items-center gap-2">
      <div className="relative flex-1">
        <span className="text-muted-foreground pointer-events-none absolute inset-y-0 left-3 flex items-center text-sm">
          ₦
        </span>

        <Input
          ref={ref}
          {...props}
          type="text"
          inputMode="decimal"
          value={value}
          onChange={(event) =>
            onChange(sanitizeAmountInput(event.target.value))
          }
          onKeyDown={(event) => {
            if (!isAmountKey(event)) event.preventDefault();
          }}
          className={cn("pl-7", className)}
        />
      </div>

      <Button
        type="button"
        variant="outline"
        size="icon"
        aria-label={`Decrease by ${step}`}
        {...decrement}
      >
        <MinusIcon size={14} />
      </Button>
      <Button
        type="button"
        variant="outline"
        size="icon"
        aria-label={`Increase by ${step}`}
        {...increment}
      >
        <PlusIcon size={14} />
      </Button>
    </div>
  );
});
