"use client";

import { useMutation, useQuery } from "convex/react";
import { AlertCircleIcon } from "lucide-react";
import type * as React from "react";
import { useState } from "react";
import { toast } from "sonner";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { api } from "@/convex/_generated/api";
import type { GuestType } from "@/convex/shared";
import { safeArray } from "@/lib/data.helpers";
import { getErrorMessage } from "@/lib/error.helpers";

const guestTypeLabels: Record<GuestType, string> = {
  visitor: "Visitor",
  student: "Student",
  event_attendee: "Event attendee",
};

type ConvertToGuestDialogProps = {
  userId: string;
  hostUserId?: string;
  guestType?: GuestType;
  children: React.ReactNode;
};

/**
 * Reclassifies today's visit as a guest visit. The plan and payment fields are
 * left untouched by the mutation; only the guest link is added or changed.
 */
export function ConvertToGuestDialog({
  userId,
  hostUserId,
  guestType,
  children,
}: ConvertToGuestDialogProps) {
  const [open, setOpen] = useState(false);
  const [host, setHost] = useState(hostUserId ?? "");
  const [type, setType] = useState<GuestType>(guestType ?? "visitor");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const hosts = useQuery(api.register.listTodaysHosts);
  const hostOptions = safeArray(hosts);
  const noHostsToday = hosts !== undefined && hostOptions.length === 0;
  const markAsGuest = useMutation(api.register.markTodaysVisitAsGuest);

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    if (next) {
      setHost(hostUserId ?? "");
      setType(guestType ?? "visitor");
    }
  };

  const handleSubmit = async () => {
    if (!host) {
      toast.error("Select the customer being visited");
      return;
    }

    setIsSubmitting(true);

    try {
      await markAsGuest({ userId, hostUserId: host, guestType: type });
      toast.success("Visit marked as a guest visit");
      setOpen(false);
    } catch (error) {
      toast.error("Could not mark visit as a guest", {
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
          <DialogTitle>Mark as a guest</DialogTitle>
          <DialogDescription className="text-sm text-start">
            Attach this visit to the customer they are visiting. The pricing
            plan and payment stay as they are.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <p className="text-sm font-medium">Customer visiting</p>
            <Select
              value={host}
              onValueChange={setHost}
              disabled={isSubmitting || hosts === undefined || noHostsToday}
            >
              <SelectTrigger className="w-full">
                <SelectValue
                  placeholder={
                    hosts === undefined ? "Loading..." : "Select a customer"
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {hostOptions.map((option) => (
                  <SelectItem key={option.userId} value={option.userId}>
                    {option.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {noHostsToday ? (
              <Alert variant="destructive">
                <AlertCircleIcon />
                <AlertTitle>No host is checked in</AlertTitle>
                <AlertDescription>
                  A guest can only be attached to a customer who is already in
                  today&apos;s scan.
                </AlertDescription>
              </Alert>
            ) : null}
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium">Guest type</p>
            <Select
              value={type}
              onValueChange={(value) => setType(value as GuestType)}
              disabled={isSubmitting}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(guestTypeLabels) as GuestType[]).map((key) => (
                  <SelectItem key={key} value={key}>
                    {guestTypeLabels[key]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting || !host}>
            {isSubmitting ? "Saving..." : "Mark as guest"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
