"use client";

import { useMutation } from "convex/react";
import { useState } from "react";
import { toast } from "sonner";
import {
  GuestCheckInForm,
  type GuestCheckInFormValues,
} from "@/components/forms/GuestCheckInForm";
import { api } from "@/convex/_generated/api";
import { getErrorMessage } from "@/lib/error.helpers";

interface GuestCheckInIntegratedProps {
  onClose: () => void;
}

export function GuestCheckInIntegrated({
  onClose,
}: GuestCheckInIntegratedProps) {
  const checkInGuest = useMutation(api.register.checkInGuest);
  const checkInExistingGuest = useMutation(api.register.checkInExistingGuest);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (values: GuestCheckInFormValues) => {
    setIsSubmitting(true);

    try {
      if (values.mode === "existing") {
        await checkInExistingGuest({
          guestUserId: values.guestUserId ?? "",
          hostUserId: values.hostUserId,
          guestType: values.guestType,
        });
        toast.success("Guest checked in");
      } else {
        await checkInGuest({
          firstName: values.firstName ?? "",
          lastName: values.lastName ?? "",
          email: values.email ?? "",
          phone: values.phone,
          hostUserId: values.hostUserId,
          guestType: values.guestType,
        });
        toast.success(`${values.firstName} ${values.lastName} checked in`);
      }
      onClose();
    } catch (error) {
      toast.error("Could not check in guest", {
        description: getErrorMessage(error),
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <GuestCheckInForm
      isLoading={isSubmitting}
      onSubmit={handleSubmit}
      onCancel={onClose}
    />
  );
}
