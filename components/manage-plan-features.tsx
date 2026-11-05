"use client";

import { useMutation, useQuery } from "convex/react";
import { Pencil, Plus, Trash } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import {
  PlanFeatureForm,
  type PlanFeatureFormValues,
} from "@/components/forms/PlanFeatureForm";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/convex/_generated/api";
import type { Doc } from "@/convex/_generated/dataModel";
import { RESERVABLE_FEATURE } from "@/lib/plan-features";

type Feature = Doc<"planFeatures">;

export function ManagePlanFeatures() {
  const features = useQuery(api.planFeatures.list);
  const createFeature = useMutation(api.planFeatures.create);
  const updateFeature = useMutation(api.planFeatures.update);
  const removeFeature = useMutation(api.planFeatures.remove);

  const [isOpen, setIsOpen] = useState(false);
  const [editing, setEditing] = useState<Feature | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (values: PlanFeatureFormValues) => {
    setIsSubmitting(true);
    try {
      if (editing) {
        await updateFeature({ id: editing._id, ...values });
        toast.success("Feature updated");
      } else {
        await createFeature(values);
        toast.success("Feature added");
      }
      setEditing(null);
    } catch (error) {
      toast.error(`Error: ${(error as Error).message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (feature: Feature) => {
    try {
      await removeFeature({ id: feature._id });
      toast.success("Feature deleted");
    } catch (error) {
      toast.error(`Error: ${(error as Error).message}`);
    }
  };

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        setIsOpen(open);
        if (!open) setEditing(null);
      }}
    >
      <DialogTrigger asChild>
        <Button variant="outline">
          <Plus className="mr-2 h-4 w-4" /> Manage features
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Plan features</DialogTitle>
          <DialogDescription>
            Features are the switches a plan can carry. Retired features stay
            attached to plans but are no longer offered.
          </DialogDescription>
        </DialogHeader>

        <PlanFeatureForm
          key={editing?._id ?? "new"}
          initialFormData={
            editing
              ? {
                  name: editing.name,
                  label: editing.label,
                  description: editing.description,
                  category: editing.category,
                  isActive: editing.isActive,
                }
              : undefined
          }
          isProtected={editing?.name === RESERVABLE_FEATURE}
          isLoading={isSubmitting}
          onSubmit={handleSubmit}
          onCancel={editing ? () => setEditing(null) : undefined}
          submitLabel={editing ? "Save changes" : "Add feature"}
        />

        {features === undefined ? (
          <div className="space-y-2">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
        ) : features.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No features yet. Add one above.
          </p>
        ) : (
          <div className="space-y-2">
            {features.map((feature) => (
              <div
                key={feature._id}
                className="flex items-start justify-between gap-3 rounded-lg border p-3"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{feature.label}</span>
                    <Badge variant={feature.isActive ? "secondary" : "outline"}>
                      {feature.isActive ? "active" : "retired"}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {feature.name} · {feature.category}
                  </p>
                  {feature.description && (
                    <p className="text-xs text-muted-foreground">
                      {feature.description}
                    </p>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setEditing(feature)}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  {feature.name !== RESERVABLE_FEATURE && (
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleDelete(feature)}
                    >
                      <Trash className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
