"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery } from "convex/react";
import { X } from "lucide-react";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/convex/_generated/api";

const accessPlanSchema = z.object({
  key: z.string().min(1, { message: "Key is required" }),
  name: z.string().min(1, { message: "Name is required" }),
  price: z.number().min(0, { message: "Price must be a positive number" }),
  no_of_days: z.number().min(1, { message: "Duration must be at least 1 day" }),
  description: z.string().optional(),
  features: z.array(z.string()),
});

type AccessPlanFormValues = z.infer<typeof accessPlanSchema>;

interface AccessPlanFormProps {
  initialFormData?: Partial<AccessPlanFormValues>;
  isLoading?: boolean;
  onSubmit: (values: AccessPlanFormValues) => Promise<void>;
  onCancel?: () => void;
  submitLabel?: string;
}

const defaultState: AccessPlanFormValues = {
  key: "",
  name: "",
  price: 0,
  no_of_days: 1,
  description: "",
  features: [],
};

type PlanFeature = {
  name: string;
  label: string;
  description: string;
  category: string;
  isActive: boolean;
};

function groupByCategory(features: PlanFeature[]): [string, PlanFeature[]][] {
  const groups = new Map<string, PlanFeature[]>();
  for (const feature of features) {
    const items = groups.get(feature.category) ?? [];
    items.push(feature);
    groups.set(feature.category, items);
  }
  return [...groups.entries()];
}

interface FeaturePickerProps {
  catalogue: PlanFeature[] | undefined;
  selected: string[];
  disabled: boolean;
  onChange: (features: string[]) => void;
}

function FeaturePicker({
  catalogue,
  selected,
  disabled,
  onChange,
}: FeaturePickerProps) {
  if (catalogue === undefined) {
    return <p className="text-sm text-muted-foreground">Loading features…</p>;
  }

  const known = new Set(catalogue.map((feature) => feature.name));
  const legacy = selected.filter((name) => !known.has(name));
  const activeGroups = groupByCategory(
    catalogue.filter((feature) => feature.isActive),
  );
  const retired = catalogue.filter(
    (feature) => !feature.isActive && selected.includes(feature.name),
  );

  const toggle = (name: string) => {
    onChange(
      selected.includes(name)
        ? selected.filter((item) => item !== name)
        : [...selected, name],
    );
  };

  if (
    activeGroups.length === 0 &&
    retired.length === 0 &&
    legacy.length === 0
  ) {
    return (
      <p className="text-sm text-muted-foreground">
        No active features. Add one under Manage features.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {activeGroups.map(([category, items]) => (
        <div key={category} className="space-y-4">
          <h4 className="text-xs font-semibold uppercase tracking-wider">
            {category}
          </h4>
          <div className="pl-8 space-y-2">
            {items.map((feature) => (
              <label
                key={feature.name}
                htmlFor={`feature-${feature.name}`}
                className="flex items-start gap-2 cursor-pointer"
              >
                <Checkbox
                  id={`feature-${feature.name}`}
                  checked={selected.includes(feature.name)}
                  onCheckedChange={() => toggle(feature.name)}
                  disabled={disabled}
                />
                <span className="text-sm leading-snug">
                  <span className="font-medium">{feature.label}</span>
                  {feature.description && (
                    <span className="block text-muted-foreground">
                      {feature.description}
                    </span>
                  )}
                </span>
              </label>
            ))}
          </div>
        </div>
      ))}

      {retired.map((feature) => (
        <label
          key={feature.name}
          htmlFor={`feature-retired-${feature.name}`}
          className="flex items-start gap-2 opacity-60"
        >
          <Checkbox id={`feature-retired-${feature.name}`} checked disabled />
          <span className="text-sm leading-snug">
            {feature.label} (retired)
          </span>
        </label>
      ))}

      {legacy.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-xs font-semibold uppercase tracking-wider">
            Unknown
          </h4>
          <div className="flex flex-wrap gap-2">
            {legacy.map((name) => (
              <Badge key={name} variant="outline" className="gap-1">
                {name}
                <button
                  type="button"
                  aria-label={`Remove ${name}`}
                  disabled={disabled}
                  onClick={() => toggle(name)}
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export function AccessPlanForm({
  initialFormData,
  isLoading = false,
  onSubmit,
  onCancel,
  submitLabel = "Add Plan",
}: AccessPlanFormProps) {
  const form = useForm<AccessPlanFormValues>({
    resolver: zodResolver(accessPlanSchema),
    defaultValues: {
      ...defaultState,
      ...initialFormData,
    },
  });

  const features = useQuery(api.planFeatures.list);

  const handleSubmit = async (values: AccessPlanFormValues) => {
    await onSubmit(values);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="key"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Key (unique identifier)</FormLabel>
              <FormControl>
                <Input
                  {...field}
                  placeholder="e.g., free, weekly, monthly"
                  disabled={isLoading || !!initialFormData?.key}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Name</FormLabel>
              <FormControl>
                <Input
                  {...field}
                  placeholder="e.g., Free Plan"
                  disabled={isLoading}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="price"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Price (₦)</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    type="number"
                    onChange={(e) =>
                      field.onChange(Number.parseInt(e.target.value, 10) || 0)
                    }
                    disabled={isLoading}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="no_of_days"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Duration (days)</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    type="number"
                    onChange={(e) =>
                      field.onChange(Number.parseInt(e.target.value, 10) || 1)
                    }
                    disabled={isLoading}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description</FormLabel>
              <FormControl>
                <Textarea
                  {...field}
                  placeholder="Description of the plan"
                  rows={2}
                  disabled={isLoading}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="features"
          render={({ field }) => (
            <FormItem className="mt-8">
              <FormLabel className="uppercase text-xs mb-4 text-muted-foreground">
                Plan Features
              </FormLabel>
              <FeaturePicker
                catalogue={features}
                selected={field.value ?? []}
                disabled={isLoading}
                onChange={field.onChange}
              />
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end gap-2">
          {onCancel && (
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={isLoading}
            >
              Cancel
            </Button>
          )}
          <Button type="submit" disabled={isLoading}>
            {isLoading
              ? `${submitLabel.replace("...", "ing")}...`
              : submitLabel}
          </Button>
        </div>
      </form>
    </Form>
  );
}
