"use client";

import { useState } from "react";
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
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

//import convex mutation and api
import { api } from "@/convex/_generated/api";
import { useMutation } from "convex/react";

type FeatureRequestFormData = {
  subject: string;
  description: string;
};

export function FeatureRequestDialog() {
  const [open, setOpen] = useState(false);
  const form = useForm<FeatureRequestFormData>();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const submitFeatureRequest = useMutation(
    api.myFunctions.submitFeatureRequest,
  );

  const onSubmit = async (data: FeatureRequestFormData) => {
    setIsSubmitting(true);
    try {
      await submitFeatureRequest({
        title: data.subject,
        description: data.description,
      });
      console.log("Feature request submitted:", data);
      toast.success("Feature request submitted successfully!");
      setOpen(false);
      form.reset();
    } catch (error) {
      console.error("Error submitting feature request:", error);
      toast.error("Failed to submit feature request. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">Request a Feature</Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-[425px]">
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <DialogHeader>
            <DialogTitle>Feature Request</DialogTitle>
            <DialogDescription>
              We&apos;re continuously improving this app and would love to hear
              your ideas. Share what features you&apos;d like to see added next!
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <label htmlFor="subject" className="text-sm font-medium">
                Subject
              </label>
              <Input
                id="subject"
                placeholder="Brief title for your feature request"
                {...form.register("subject", { required: true })}
              />
              {form.formState.errors.subject && (
                <span className="text-sm text-red-500">
                  Subject is required
                </span>
              )}
            </div>
            <div className="space-y-2">
              <label htmlFor="description" className="text-sm font-medium">
                Description
              </label>
              <Textarea
                id="description"
                placeholder="Describe your feature request in detail"
                className="min-h-[100px]"
                {...form.register("description", { required: true })}
              />
              {form.formState.errors.description && (
                <span className="text-sm text-red-500">
                  Description is required
                </span>
              )}
            </div>
          </div>

          <div className="border-t my-4 -mx-6" />

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={isSubmitting}>
              {isSubmitting ? "Submitting..." : "Submit Request"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
