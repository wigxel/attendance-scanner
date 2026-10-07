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
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (values: GuestCheckInFormValues) => {
    setIsSubmitting(true);

    try {
      await checkInGuest(values);

      toast.success(`${values.firstName} ${values.lastName} checked in`);
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
