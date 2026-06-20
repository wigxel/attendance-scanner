"use client";

import { useMutation } from "convex/react";
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { api } from "@/convex/_generated/api";

interface DeleteRoleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  roleId: string | null;
  roleName: string | null;
}

export function DeleteRoleDialog({
  open,
  onOpenChange,
  roleId,
  roleName,
}: DeleteRoleDialogProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const deleteRole = useMutation(api.roles.deleteRole);

  const handleDelete = async () => {
    if (!roleId) return;

    setIsDeleting(true);
    try {
      const res = await deleteRole({ roleId: roleId });
      if (!res.success) {
        throw new Error(res.error);
      }
      onOpenChange(false);
    } catch (error) {
      alert(error instanceof Error ? error.message : "Failed to delete role.");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete Role</DialogTitle>
          <DialogDescription>
            {`Are you sure you want to delete the role "${roleName}"? This action
            cannot be undone. If there are users assigned to this role, the
            deletion will be blocked.`}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="mt-4">
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            disabled={isDeleting}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={isDeleting}
            className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
          >
            {isDeleting ? "Deleting..." : "Delete Role"}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
