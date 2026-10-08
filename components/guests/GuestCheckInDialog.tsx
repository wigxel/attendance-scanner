"use client";

import type * as React from "react";
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { GuestCheckInIntegrated } from "./GuestCheckInIntegrated";

interface GuestCheckInDialogProps {
  children: React.ReactNode;
}

export function GuestCheckInDialog({ children }: GuestCheckInDialogProps) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>Check in a guest</DialogTitle>
          <DialogDescription>
            Capture the visitor&apos;s details and attach them to the customer
            they are visiting. They do not need to sign up.
          </DialogDescription>
        </DialogHeader>

        <GuestCheckInIntegrated onClose={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  );
}
