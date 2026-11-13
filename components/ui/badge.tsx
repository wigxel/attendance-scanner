import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import type * as React from "react";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center justify-center border px-2 py-0.5 text-xs font-medium w-fit whitespace-nowrap shrink-0 [&>svg]:size-3 gap-1 [&>svg]:pointer-events-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive transition-[color,box-shadow] overflow-hidden",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-primary/50 border-dashed text-primary-foreground [a&]:hover:bg-primary/90",
        secondary:
          "border-transparent bg-secondary/50 border-dashed text-secondary-foreground [a&]:hover:bg-secondary/90",
        destructive:
          "text-red-700 dark:text-red-500 border-dashed border-red-700 dark:border-red-500/50 dark:bg-red-950 [a&]:hover:bg-red-500/90",
        outline:
          "text-foreground [a&]:hover:bg-accent [a&]:hover:text-accent-foreground",
        success:
          "text-green-700 dark:text-green-500 border-dashed border-green-700 dark:border-green-500/50 dark:bg-green-950 [a&]:hover:bg-green-500/90",
        info: "text-purple-700 dark:text-purple-500 border-dashed border-purple-700 dark:border-purple-500/50 dark:bg-purple-950 [a&]:hover:bg-purple-500/90",
        warning:
          "text-amber-700 dark:text-amber-500 border-dashed border-amber-700 dark:border-amber-500/50 dark:bg-amber-950 [a&]:hover:bg-amber-500/90",
      },
      defaultVariants: {
        variant: "default",
      },
    },
  },
);

function Badge({
  className,
  variant,
  asChild = false,
  ...restProps
}: React.ComponentProps<"span"> &
  VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot : "span";

  return (
    <Comp
      data-slot="badge"
      className={cn(badgeVariants({ variant }), className)}
      {...restProps}
    />
  );
}

export { Badge, badgeVariants };
