"use client";

import { useMutation } from "convex/react";
import type * as React from "react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api } from "@/convex/_generated/api";
import { useCustomer } from "@/hooks/auth";
import { getErrorMessage } from "@/lib/error.helpers";

type ConvertToRegularDialogProps = {
  userId: string;
  children: React.ReactNode;
};

/**
 * Turns today's guest visit into a regular visit. The plan and payment fields
 * are left untouched by the mutation; only the guest link is cleared.
 *
 * A visitor entered by staff can have no customer profile. Their email is then
 * used to attach today's visit to the customer already on file, so the visit
 * count and history continue.
 */
export function ConvertToRegularDialog({
  userId,
  children,
}: ConvertToRegularDialogProps) {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const profile = useCustomer({ userId });
  const needsLink = profile === null;
  const markAsRegular = useMutation(api.register.markTodaysVisitAsRegular);

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    if (!next) setEmail("");
  };

  const handleSubmit = async () => {
    const linkEmail = needsLink ? email.trim() : "";

    setIsSubmitting(true);

    try {
      await markAsRegular({ userId, linkEmail: linkEmail || undefined });
      toast.success("Visit marked as a regular visit");
      setOpen(false);
    } catch (error) {
      toast.error("Could not mark visit as regular", {
        description: getErrorMessage(error),
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>{children}</DialogTrigger>

      <DialogContent className="text-start">
        <DialogHeader>
          <DialogTitle>Mark as a regular visit</DialogTitle>
          <DialogDescription className="text-sm text-start">
            This visit stops being a guest visit. The pricing plan and payment
            stay as they are, and it stays on the same day in the register.
          </DialogDescription>
        </DialogHeader>

        {needsLink ? (
          <div className="space-y-2">
            <Label htmlFor="regular-visit-email">Customer email</Label>
            <Input
              id="regular-visit-email"
              type="email"
              placeholder="customer@example.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              disabled={isSubmitting}
            />
            <p className="text-xs text-muted-foreground text-start">
              This visitor has no customer profile yet. Their email attaches
              this visit to the customer already on file, or creates one. Leave
              it blank to keep the visitor as they are.
            </p>
          </div>
        ) : null}

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? "Saving..." : "Mark as regular"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
