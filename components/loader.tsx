import { LucideLoader } from "lucide-react";
import { cn } from "@/lib/utils";

const sizeMap = {
  sm: "h-3 w-3",
  md: "h-4 w-4",
  lg: "h-6 w-6",
  xl: "h-8 w-8",
} as const;

export function AppSpinner({
  size = "md",
  className,
}: {
  size?: keyof typeof sizeMap;
  className?: string;
}) {
  return (
    <LucideLoader
      strokeWidth={1}
      className={cn(
        sizeMap[size],
        "animate-spin dark:text-cyan-400 text-muted-foreground",
        className,
      )}
    />
  );
}

export function AppLoader() {
  return (
    <div className="bg-(--background) aspect-square w-min rounded-full p-4">
      <AppSpinner size="xl" />
    </div>
  );
}

type BackgroundActivityIndicatorProps = {
  className?: string;
  label?: string;
};

export function BackgroundActivityIndicator({
  className,
  label = "Saving",
}: BackgroundActivityIndicatorProps) {
  return (
    <span
      role="status"
      className={cn(
        className,
        "p-2 rounded-full inline-flex items-center justify-center",
      )}
    >
      <AppSpinner size="md" />
      <span className="sr-only">{label}</span>
    </span>
  );
}
