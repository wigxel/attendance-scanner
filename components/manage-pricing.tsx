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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import { Pencil, Plus, Trash } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

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

  const [formData, setFormData] = useState({
    key: "",
    name: "",
    price: 0,
    no_of_days: 1,
    description: "",
    features: "",
  });

  const [currentPlanId, setCurrentPlanId] = useState<string | null>(null);
  const [planToDelete, setPlanToDelete] = useState<AccessPlan | null>(null);

  const accessPlans = useQuery(api.myFunctions.listAccessPlans);
  const addAccessPlan = useMutation(api.myFunctions.addAccessPlan);
  const updateAccessPlan = useMutation(api.myFunctions.updateAccessPlan);
  const deleteAccessPlan = useMutation(api.myFunctions.deleteAccessPlan);

  const resetForm = () => {
    setFormData({
      key: "",
      name: "",
      price: 0,
      no_of_days: 1,
      description: "",
      features: "",
    });
    setCurrentPlanId(null);
  };

  const handleAdd = async () => {
    if (!formData.key.trim() || !formData.name.trim()) {
      toast.error("Key and Name are required");
      return;
    }

    try {
      await addAccessPlan({
        key: formData.key.trim(),
        name: formData.name.trim(),
        price: formData.price,
        no_of_days: formData.no_of_days,
        description: formData.description.trim() || undefined,
        features: formData.features
          ? formData.features.split(",").map((f) => f.trim()).filter(Boolean)
          : undefined,
      });
      toast.success("Pricing plan added successfully");
      resetForm();
      setAddDialogOpen(false);
    } catch (error) {
      toast.error(`Error: ${(error as Error).message}`);
    }
  };

  const handleEdit = async () => {
    if (!currentPlanId || !formData.name.trim()) {
      toast.error("Name is required");
      return;
    }

    try {
      await updateAccessPlan({
        id: currentPlanId as Id<"accessPlans">,
        name: formData.name.trim(),
        price: formData.price,
        no_of_days: formData.no_of_days,
        description: formData.description.trim() || undefined,
        features: formData.features
          ? formData.features.split(",").map((f) => f.trim()).filter(Boolean)
          : undefined,
      });
      toast.success("Pricing plan updated successfully");
      resetForm();
      setIsEditDialogOpen(false);
    } catch (error) {
      toast.error(`Error: ${(error as Error).message}`);
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
    setFormData({
      key: plan.key,
      name: plan.name,
      price: plan.price,
      no_of_days: plan.no_of_days,
      description: plan.description,
      features: plan.features.join(", "),
    });
    setIsEditDialogOpen(true);
  };

  const openDeleteAlert = (plan: AccessPlan) => {
    setPlanToDelete(plan);
    setIsDeleteAlertOpen(true);
  };

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
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="key">Key (unique identifier)</Label>
                <Input
                  id="key"
                  value={formData.key}
                  onChange={(e) =>
                    setFormData({ ...formData, key: e.target.value })
                  }
                  placeholder="e.g., free, weekly, monthly"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  placeholder="e.g., Free Plan"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="price">Price (₦)</Label>
                  <Input
                    id="price"
                    type="number"
                    value={formData.price}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        price: Number.parseInt(e.target.value) || 0,
                      })
                    }
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="days">Duration (days)</Label>
                  <Input
                    id="days"
                    type="number"
                    value={formData.no_of_days}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        no_of_days: Number.parseInt(e.target.value) || 1,
                      })
                    }
                  />
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  placeholder="Description of the plan"
                  rows={2}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="features">Features (comma-separated)</Label>
                <Input
                  id="features"
                  value={formData.features}
                  onChange={(e) =>
                    setFormData({ ...formData, features: e.target.value })
                  }
                  placeholder="e.g., priority-check-in, booking"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setAddDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleAdd}>Add Plan</Button>
            </DialogFooter>
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
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>Key</Label>
              <div className="px-3 py-2 bg-muted rounded-md text-muted-foreground font-mono text-sm">
                {formData.key}
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-name">Name</Label>
              <Input
                id="edit-name"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="edit-price">Price (₦)</Label>
                <Input
                  id="edit-price"
                  type="number"
                  value={formData.price}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      price: Number.parseInt(e.target.value) || 0,
                    })
                  }
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-days">Duration (days)</Label>
                <Input
                  id="edit-days"
                  type="number"
                  value={formData.no_of_days}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      no_of_days: Number.parseInt(e.target.value) || 1,
                    })
                  }
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-description">Description</Label>
              <Textarea
                id="edit-description"
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                rows={2}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-features">Features (comma-separated)</Label>
              <Input
                id="edit-features"
                value={formData.features}
                onChange={(e) =>
                  setFormData({ ...formData, features: e.target.value })
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleEdit}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={isDeleteAlertOpen} onOpenChange={setIsDeleteAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Pricing Plan?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the{" "}
              {planToDelete?.name} plan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setPlanToDelete(null)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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
                    <Pencil className="h-4 w-4 mr-1" /> Edit
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => openDeleteAlert(plan)}
                  >
                    <Trash className="h-4 w-4 mr-1" />
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