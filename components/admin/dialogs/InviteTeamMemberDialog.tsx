"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useAction } from "convex/react";
import { Loader2 } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { SelectRole } from "@/components/fields/SelectRole";
import { CustomerCombobox } from "@/components/forms/CustomerCombobox";
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
import { Label } from "@/components/ui/label";
import { api } from "@/convex/_generated/api";
import { getErrorMessage } from "@/lib/error.helpers";

const schema = z.object({
  userId: z.string().min(1, "Select a user"),
  role: z.string().min(1, "Select a role"),
});

type FormValues = z.infer<typeof schema>;

export function InviteTeamMemberDialog() {
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const upgradeToAdmin = useAction(api.acl.upgradeToAdmin);

  const {
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { userId: "", role: "admin" },
  });

  const watchRole = watch("role");
  const watchUserId = watch("userId");

  const onSubmit = async (values: FormValues) => {
    setIsSubmitting(true);
    try {
      await upgradeToAdmin({ userId: values.userId, role: values.role });
      toast.success("User has been upgraded to admin.");
      setOpen(false);
      reset();
    } catch (error) {
      toast.error("Failed to upgrade user", {
        description: getErrorMessage(error),
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>Add Member</Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-md">
        <form onSubmit={handleSubmit(onSubmit)}>
          <DialogHeader>
            <DialogTitle>Add Team Member</DialogTitle>
            <DialogDescription>
              Upgrade an existing user to an admin role.
            </DialogDescription>
          </DialogHeader>

          <div className="gap-4 flex flex-col py-4">
            <div className="space-y-2">
              <Label>Customer</Label>
              <CustomerCombobox
                value={watchUserId}
                onChange={(userId) => setValue("userId", userId)}
              />
              {errors.userId && (
                <p className="text-xs text-red-600">{errors.userId.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Role</Label>
              <SelectRole
                value={watchRole}
                onValueChange={(value) => setValue("role", value)}
                className="w-full"
              />
              {errors.role && (
                <p className="text-xs text-red-600">{errors.role.message}</p>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              {isSubmitting ? "Adding\u2026" : "Add Member"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
