"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "convex/react";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { api } from "@/convex/_generated/api";

const permissionSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().min(1, "Description is required"),
  category: z.string().min(1, "Category is required"),
});

type PermissionFormValues = z.infer<typeof permissionSchema>;

interface PermissionFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  permission?: {
    _id: string;
    name: string;
    description: string;
    category: string;
  } | null;
  onSuccess?: () => void;
}

const defaultState: PermissionFormValues = {
  name: "",
  description: "",
  category: "",
};

export function PermissionFormDialog({
  open,
  onOpenChange,
  permission,
  onSuccess,
}: PermissionFormDialogProps) {
  const createPermission = useMutation(api.permissions.createPermission);
  const updatePermission = useMutation(api.permissions.updatePermission);

  const isEditing = !!permission;

  const form = useForm<PermissionFormValues>({
    resolver: zodResolver(permissionSchema),
    defaultValues: defaultState,
  });

  const { register, handleSubmit, reset, formState } = form;

  useEffect(() => {
    if (open) {
      if (permission) {
        reset({
          name: permission.name,
          description: permission.description,
          category: permission.category,
        });
      } else {
        reset(defaultState);
      }
    }
  }, [open, permission, reset]);

  const onSubmit = async (data: PermissionFormValues) => {
    try {
      if (isEditing && permission) {
        const res = await updatePermission({
          permissionId: permission._id,
          name: data.name,
          description: data.description,
          category: data.category,
        });
        if (!res.success) throw new Error(res.error);
      } else {
        const res = await createPermission({
          name: data.name,
          description: data.description,
          category: data.category,
        });
        if (!res.success) throw new Error(res.error);
      }

      reset(defaultState);
      onOpenChange(false);
      onSuccess?.();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Something went wrong.");
    }
  };

  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) reset(defaultState);
    onOpenChange(isOpen);
  };

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle>
            {isEditing ? "Edit Permission" : "Add New Permission"}
          </SheetTitle>
        </SheetHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 py-4 px-4">
          <div className="space-y-4">
            <div>
              <label
                htmlFor="name"
                className="block text-sm font-medium text-gray-700"
              >
                Permission Name *
              </label>
              <input
                id="name"
                type="text"
                {...register("name")}
                placeholder="e.g. reports:export"
                className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
              {formState.errors.name && (
                <p className="mt-1 text-xs text-red-600">
                  {formState.errors.name.message}
                </p>
              )}
            </div>

            <div>
              <label
                htmlFor="description"
                className="block text-sm font-medium text-gray-700"
              >
                Description *
              </label>
              <textarea
                id="description"
                rows={3}
                {...register("description")}
                placeholder="e.g. Export reports to CSV"
                className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
              {formState.errors.description && (
                <p className="mt-1 text-xs text-red-600">
                  {formState.errors.description.message}
                </p>
              )}
            </div>

            <div>
              <label
                htmlFor="category"
                className="block text-sm font-medium text-gray-700"
              >
                Category *
              </label>
              <input
                id="category"
                type="text"
                {...register("category")}
                placeholder="e.g. Reports"
                className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
              {formState.errors.category && (
                <p className="mt-1 text-xs text-red-600">
                  {formState.errors.category.message}
                </p>
              )}
            </div>
          </div>

          <SheetFooter className="sticky bottom-0 bg-white flex flex-row justify-end pt-4 !px-0">
            <SheetTrigger>
              <Button variant={"outline"}>Cancel</Button>
            </SheetTrigger>

            <Button type="submit" disabled={formState.isSubmitting}>
              {formState.isSubmitting
                ? isEditing
                  ? "Saving..."
                  : "Creating..."
                : isEditing
                  ? "Save Changes"
                  : "Create Permission"}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
