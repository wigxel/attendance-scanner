"use client";
import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Trash, Pencil, Plus } from "lucide-react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Id } from "@/convex/_generated/dataModel";

export default function OccupationManagement() {
  //state for form values
  const [isAddDialogOpen, setAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  const [currentOccupationId, setCurrentOccupationId] = useState<string | null>(
    null,
  );

  //convex quries and mutations
  const occupations = useQuery(api.myFunctions.listOccupations);
  const addOccupation = useMutation(api.myFunctions.addOccupation);
  const updateOccupation = useMutation(api.myFunctions.updateOccupation);
  const removeOccupation = useMutation(api.myFunctions.deleteOccupation);

  //Handle add occupation
  const handleAddOccupation = async () => {
    if (!name.trim()) {
      toast.error("Occupation name is required");
      return;
    }

    try {
      await addOccupation({ name, description });
      toast.success("Occupation added successfully");
      resetForm();
      setAddDialogOpen(false);
    } catch (error) {
      toast.error(`Error adding occupation: ${(error as Error).message}`);
    }
  };

  //Handle edit occupation
  const handleEditOccupation = async () => {
    if (!currentOccupationId || !name.trim()) {
      toast.error("Occupation name is required");
      return;
    }
    await updateOccupation({
      id: currentOccupationId as Id<"occupations">,
      name,
      description,
    });
    try {
      await updateOccupation({
        id: currentOccupationId as Id<"occupations">,
        name,
        description,
      });
      toast.success("Occupation updated successfully");
      resetForm();
      setIsEditDialogOpen(false);
    } catch (error) {
      toast.error(`Error updating occupation: ${(error as Error).message}`);
    }
  };

  //Handle delete occupation
  const handleDeleteOccupation = async (id: string) => {
    if (!confirm("Are you sure you want to delete this occupation?")) return;
    try {
      await removeOccupation({ id: id as Id<"occupations"> });
      toast.success("Occupation deleted successfully");
    } catch (error) {
      toast.error(`Error deleting occupation: ${(error as Error).message}`);
    }
  };

  //Open edit dialog with occupation data
  interface Occupation {
    id: string;
    name: string;
    description?: string;
  }

  const openEditDialog = (occupation: Occupation) => {
    setCurrentOccupationId(occupation.id);
    setName(occupation.name);
    setDescription(occupation.description || "");
    setIsEditDialogOpen(true);
  };

  //Reset form values
  const resetForm = () => {
    setName("");
    setDescription("");
    setCurrentOccupationId(null);
  };

  return (
    <div className="flex gap-4 flex-col">
      <div className="flex justify-end">
        <Dialog open={isAddDialogOpen} onOpenChange={setAddDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => resetForm()}>
              <Plus className="mr-2 h-4 w-4" /> Add Occupation
            </Button>
          </DialogTrigger>

          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Occupation</DialogTitle>
              <DialogDescription>
                Create a new occupation option for users to select during
                onboarding.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Software Developer"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="description">Description (Optional)</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Professional who develops software applications"
                  rows={3}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setAddDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleAddOccupation}>Add Occupation</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Occupation</DialogTitle>
            <DialogDescription>
              Update the details of the selected occupation.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="edit-name">Name</Label>
              <Input
                id="edit-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-description">Description (Optional)</Label>
              <Textarea
                id="edit-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsEditDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button onClick={handleEditOccupation}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Occupation List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {(occupations ?? []).length > 0 ? (
          (occupations ?? []).map((occupation: Occupation) => (
            <Card
              key={occupation.id}
              className="shadow-sm hover:shadow-md transition-shadow duration-200 border"
            >
              <CardHeader>
                <CardTitle>{occupation.name}</CardTitle>
                {occupation.description && (
                  <CardDescription>{occupation.description}</CardDescription>
                )}
              </CardHeader>
              <CardFooter className="flex justify-end gap-2 border-t p-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => openEditDialog(occupation)}
                >
                  <Pencil className="h-4 w-4 mr-1" /> Edit
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => handleDeleteOccupation(occupation.id)}
                >
                  <Trash className="h-4 w-4 mr-1" /> Delete
                </Button>
              </CardFooter>
            </Card>
          ))
        ) : (
          <div className="col-span-full text-center p-8 border rounded-lg bg-muted/30 text-muted-foreground">
            <p className="text-muted-foreground">
              No occupations available. Add some to get started.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
