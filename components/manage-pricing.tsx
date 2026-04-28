"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import { Pencil, Plus, Trash } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { AccessPlanForm } from "./forms/AccessPlanForm";

interface AccessPlan {
  _id: Id<"accessPlans">;
  key: string;
  name: string;
  price: number;
  no_of_days: number;
  description: string;
  features: string[];
}

export function formatPrice(price: number): string {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
  }).format(price);
}

export default function PricingManagement() {
  const [isAddDialogOpen, setAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteAlertOpen, setIsDeleteAlertOpen] = useState(false);

  const [currentPlanId, setCurrentPlanId] = useState<string | null>(null);
  const [planToDelete, setPlanToDelete] = useState<AccessPlan | null>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);

  const accessPlans = useQuery(api.myFunctions.listAccessPlans);
  const addAccessPlan = useMutation(api.myFunctions.addAccessPlan);
  const updateAccessPlan = useMutation(api.myFunctions.updateAccessPlan);
  const deleteAccessPlan = useMutation(api.myFunctions.deleteAccessPlan);

  const resetForm = () => {
    setCurrentPlanId(null);
  };

  const handleAdd = async (values: {
    key: string;
    name: string;
    price: number;
    no_of_days: number;
    description?: string;
    features?: string;
  }) => {
    setIsSubmitting(true);
    try {
      await addAccessPlan({
        key: values.key.trim(),
        name: values.name.trim(),
        price: values.price,
        no_of_days: values.no_of_days,
        description: values.description?.trim() || undefined,
        features: values.features
          ? values.features
              .split(",")
              .map((f) => f.trim())
              .filter(Boolean)
          : undefined,
      });
      toast.success("Pricing plan added successfully");
      setAddDialogOpen(false);
    } catch (error) {
      toast.error(`Error: ${(error as Error).message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = async (values: {
    key: string;
    name: string;
    price: number;
    no_of_days: number;
    description?: string;
    features?: string;
  }) => {
    if (!currentPlanId) return;
    setIsSubmitting(true);
    try {
      await updateAccessPlan({
        id: currentPlanId as Id<"accessPlans">,
        name: values.name.trim(),
        price: values.price,
        no_of_days: values.no_of_days,
        description: values.description?.trim() || undefined,
        features: values.features
          ? values.features
              .split(",")
              .map((f) => f.trim())
              .filter(Boolean)
          : undefined,
      });
      toast.success("Pricing plan updated successfully");
      setIsEditDialogOpen(false);
    } catch (error) {
      toast.error(`Error: ${(error as Error).message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!planToDelete) return;

    try {
      await deleteAccessPlan({ id: planToDelete._id });
      toast.success("Pricing plan deleted successfully");
      setPlanToDelete(null);
      setIsDeleteAlertOpen(false);
    } catch (error) {
      toast.error(`Error: ${(error as Error).message}`);
    }
  };

  const openEditDialog = (plan: AccessPlan) => {
    setCurrentPlanId(plan._id);
    setIsEditDialogOpen(true);
  };

  const openDeleteAlert = (plan: AccessPlan) => {
    setPlanToDelete(plan);
    setIsDeleteAlertOpen(true);
  };

  const currentPlan = accessPlans?.find((p) => p._id === currentPlanId);

  return (
    <div className="flex gap-4 flex-col">
      <div className="flex justify-end">
        <Dialog open={isAddDialogOpen} onOpenChange={setAddDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => resetForm()}>
              <Plus className="mr-2 h-4 w-4" /> Add Plan
            </Button>
          </DialogTrigger>

          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Pricing Plan</DialogTitle>
              <DialogDescription>
                Create a new access plan for customers.
              </DialogDescription>
            </DialogHeader>
            <AccessPlanForm
              onSubmit={handleAdd}
              onCancel={() => setAddDialogOpen(false)}
              isLoading={isSubmitting}
              submitLabel="Add Plan"
            />
          </DialogContent>
        </Dialog>
      </div>

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Pricing Plan</DialogTitle>
            <DialogDescription>
              Update the details of the pricing plan.
            </DialogDescription>
          </DialogHeader>
          <AccessPlanForm
            initialFormData={
              currentPlan
                ? {
                    key: currentPlan.key,
                    name: currentPlan.name,
                    price: currentPlan.price,
                    no_of_days: currentPlan.no_of_days,
                    description: currentPlan.description,
                    features: currentPlan.features.join(", "),
                  }
                : undefined
            }
            onSubmit={handleEdit}
            onCancel={() => setIsEditDialogOpen(false)}
            isLoading={isSubmitting}
            submitLabel="Save Changes"
          />
        </DialogContent>
      </Dialog>

      <Dialog open={isDeleteAlertOpen} onOpenChange={setIsDeleteAlertOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Pricing Plan?</DialogTitle>
            <DialogDescription>
              This action cannot be undone. This will permanently delete the{" "}
              {planToDelete?.name} plan.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPlanToDelete(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {(accessPlans ?? []).length > 0 ? (
          (accessPlans ?? []).map((plan: AccessPlan) => (
            <Card
              key={plan._id}
              className="shadow-sm hover:shadow-md transition-shadow duration-200 border"
            >
              <CardHeader>
                <CardTitle>{plan.name}</CardTitle>
                <CardDescription>{plan.description}</CardDescription>
              </CardHeader>
              <CardFooter className="flex justify-between border-t p-4">
                <div className="text-lg font-semibold">
                  {formatPrice(plan.price)}
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openEditDialog(plan)}
                  >
                    <Pencil className="h-4 w-4" />
                    <span>Edit</span>
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => openDeleteAlert(plan)}
                  >
                    <Trash className="h-4 w-4" />
                  </Button>
                </div>
              </CardFooter>
            </Card>
          ))
        ) : (
          <div className="col-span-full text-center p-8 border rounded-lg bg-muted/30 text-muted-foreground">
            <p>No pricing plans available. Add one to get started.</p>
          </div>
        )}
      </div>
    </div>
  );
}
