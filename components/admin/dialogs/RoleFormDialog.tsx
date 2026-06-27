"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "convex/react";
import { Loader2 } from "lucide-react";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { api } from "@/convex/_generated/api";

const roleSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().min(1, "Description is required"),
  privileges: z.array(z.string()),
});

type RoleFormValues = z.infer<typeof roleSchema>;

interface RoleFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  role?: {
    _id: string;
    name: string;
    description: string;
    privileges: string[];
  } | null;
  onSuccess?: () => void;
}

const defaultState: RoleFormValues = {
  name: "",
  description: "",
  privileges: [],
};

export function RoleFormDialog({
  open,
  onOpenChange,
  role,
  onSuccess,
}: RoleFormDialogProps) {
  const createRole = useMutation(api.acl.createRole);
  const updateRole = useMutation(api.acl.updateRole);
  const permissionsByCategory = useQuery(
    api.permissions.listPermissionsByCategory,
  );

  const privilegeGroups = Object.entries(permissionsByCategory ?? {}).map(
    ([category, perms]) => ({
      label: category,
      items: perms.map((p) => ({
        key: p.name,
        label: p.description,
      })),
    }),
  );

  const isEditing = !!role;

  const form = useForm<RoleFormValues>({
    resolver: zodResolver(roleSchema),
    defaultValues: defaultState,
  });

  const { register, handleSubmit, reset, setValue, watch, formState } = form;

  const selectedPrivileges = watch("privileges");

  useEffect(() => {
    if (open) {
      if (role) {
        reset({
          name: role.name,
          description: role.description,
          privileges: role.privileges,
        });
      } else {
        reset(defaultState);
      }
    }
  }, [open, role, reset]);

  const onSubmit = async (data: RoleFormValues) => {
    try {
      if (isEditing && role) {
        const res = await updateRole({
          roleId: role._id,
          name: data.name,
          description: data.description,
          privileges: data.privileges,
        });
        if (!res.success) throw new Error(res.error);
      } else {
        const res = await createRole({
          name: data.name,
          description: data.description,
          privileges: data.privileges,
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
    if (!isOpen) {
      reset(defaultState);
    }
    onOpenChange(isOpen);
  };

  const togglePrivilege = (key: string) => {
    const current = new Set(selectedPrivileges);
    if (current.has(key)) {
      current.delete(key);
    } else {
      current.add(key);
    }
    setValue("privileges", Array.from(current), { shouldDirty: true });
  };

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{isEditing ? "Edit Role" : "Add New Role"}</SheetTitle>
        </SheetHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 py-4 px-4">
          <div className="space-y-4">
            <div>
              <label
                htmlFor="name"
                className="block text-sm font-medium text-gray-700"
              >
                Role Name *
              </label>
              <input
                id="name"
                type="text"
                {...register("name")}
                className="mt-1 w-full rounded-md border border-(--border) px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                disabled={role?.name === "admin"}
              />
              {form.formState.errors.name && (
                <p className="mt-1 text-xs text-red-600">
                  {form.formState.errors.name.message}
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
                className="mt-1 w-full rounded-md border border-(--border) px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
              {form.formState.errors.description && (
                <p className="mt-1 text-xs text-red-600">
                  {form.formState.errors.description.message}
                </p>
              )}
            </div>
          </div>

          <div>
            <h3 className="text-sm font-medium text-gray-900 mb-3">
              Privileges
            </h3>
            <div className="space-y-6">
              {permissionsByCategory === undefined ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
                </div>
              ) : privilegeGroups.length === 0 ? (
                <p className="text-sm text-gray-500">
                  No permissions found. Run seedPermissions first.
                </p>
              ) : (
                privilegeGroups.map((group) => (
                  <div key={group.label} className="space-y-2">
                    <h4 className="text-xs font-semibold text-foreground uppercase tracking-wider">
                      {group.label}
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {group.items.map(
                        (item: { key: string; label: string }) => {
                          const isSelected = selectedPrivileges.includes(
                            item.key,
                          );
                          return (
                            <label
                              key={item.key}
                              htmlFor={item.key}
                              className="flex items-start space-x-2 cursor-pointer p-2 rounded hover:bg-background"
                            >
                              <Checkbox
                                id={item.key}
                                checked={isSelected}
                                onCheckedChange={() =>
                                  togglePrivilege(item.key)
                                }
                              />
                              <span className="text-sm text-muted-foreground leading-snug">
                                {item.label}
                              </span>
                            </label>
                          );
                        },
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <SheetFooter className="sticky flex-row *:flex-1 bottom-0 bg-(--background) pt-4 border-t mt-6">
            <Button variant="outline" onClick={() => handleOpenChange(false)}>
              Cancel
            </Button>
            <Button
              variant="default"
              type="submit"
              disabled={formState.isSubmitting}
            >
              {formState.isSubmitting
                ? isEditing
                  ? "Saving..."
                  : "Creating..."
                : isEditing
                  ? "Save Changes"
                  : "Create Role"}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
