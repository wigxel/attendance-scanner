"use client";

import { useMutation, useQuery } from "convex/react";
import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { api } from "@/convex/_generated/api";

interface ChangeRoleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: { identityId: string; name: string; role: string; roleId: string };
  onSuccess?: () => void;
}

export function ChangeRoleDialog({
  open,
  onOpenChange,
  user,
  onSuccess,
}: ChangeRoleDialogProps) {
  const [selectedRoleId, setSelectedRoleId] = useState<string>(user.roleId);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const roles = useQuery(api.roles.getRoles);
  const updateIdentityRole = useMutation(api.acl.updateIdentityRole);

  useEffect(() => {
    setSelectedRoleId(user.roleId);
  }, [user.roleId]);

  const handleConfirm = async () => {
    setError(null);
    setIsSubmitting(true);
    try {
      const res = await updateIdentityRole({
        identityId: user.identityId,
        roleId: selectedRoleId,
      });
      if (!res.success) throw new Error(res.error);
      onOpenChange(false);
      onSuccess?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to change role.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Change Role</DialogTitle>
          <DialogDescription>
            Change <strong>{user.name}</strong>&apos;s role from{" "}
            <strong>{user.role}</strong>.
          </DialogDescription>
        </DialogHeader>
        <div>
          <label
            htmlFor="change-role"
            className="block text-sm font-medium text-gray-700"
          >
            New Role
          </label>
          <select
            id="change-role"
            value={selectedRoleId}
            onChange={(e) => setSelectedRoleId(e.target.value)}
            className="mt-1 w-full rounded-md border border-gray-300 py-2 pl-3 pr-10 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          >
            {(roles ?? []).map((role: any) => (
              <option key={role._id} value={role._id}>
                {role.name}
              </option>
            ))}
          </select>
        </div>
        {error && (
          <p className="rounded-md bg-red-50 p-3 text-xs text-red-700">
            {error}
          </p>
        )}
        <p className="rounded-md bg-yellow-50 p-3 text-xs text-yellow-800">
          Changing a user&apos;s role will immediately affect their access and
          permissions.
        </p>
        <DialogFooter>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={selectedRoleId === user.roleId || isSubmitting}
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90 disabled:opacity-50"
          >
            {isSubmitting ? "Saving\u2026" : "Confirm"}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
