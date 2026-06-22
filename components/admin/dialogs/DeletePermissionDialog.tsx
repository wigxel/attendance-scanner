"use client";

import { useMutation } from "convex/react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { api } from "@/convex/_generated/api";

interface DeletePermissionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  permissionId: string | null;
  permissionName: string | null;
}

export function DeletePermissionDialog({
  open,
  onOpenChange,
  permissionId,
  permissionName,
}: DeletePermissionDialogProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const deletePermission = useMutation(api.permissions.deletePermission);

  const handleDelete = async () => {
    if (!permissionId) return;

    setIsDeleting(true);
    try {
      const res = await deletePermission({ permissionId });
      if (!res.success) throw new Error(res.error);
      setConfirmText("");
      onOpenChange(false);
    } catch (error) {
      alert(
        error instanceof Error ? error.message : "Failed to delete permission.",
      );
    } finally {
      setIsDeleting(false);
    }
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) setConfirmText("");
    onOpenChange(open);
  };

  const canDelete = confirmText === permissionName && !isDeleting;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete Permission</DialogTitle>
          <DialogDescription>
            {`Are you sure you want to delete the permission "${permissionName}"? This action cannot be undone. If any roles currently include this permission, they will lose it.`}
          </DialogDescription>
        </DialogHeader>

        <div className="mt-2">
          <label
            htmlFor=""
            className="block text-sm font-medium text-muted-foreground mb-1"
          >
            Type <span className="text-foreground">{permissionName}</span> to
            confirm:
          </label>
          <Input
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            placeholder={`Type "${permissionName}" to confirm`}
            autoFocus
          />
        </div>

        <DialogFooter className="mt-4">
          <Button
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={isDeleting}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={!canDelete}
          >
            {isDeleting ? "Deleting..." : "Delete Permission"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
