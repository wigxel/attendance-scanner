"use client";

import { useMutation, useQuery } from "convex/react";
import { formatDistanceToNow } from "date-fns";
import {
  ArrowBigDown,
  ArrowBigUp,
  ArrowDown,
  ArrowUp,
  CheckCircle2,
  LightbulbIcon,
  Trash2,
  XIcon,
} from "lucide-react";
import { motion } from "motion/react";
import Image from "next/image";
import { useState } from "react";
import { toast } from "sonner";
import { api } from "@/convex/_generated/api";
import type { Doc, Id } from "@/convex/_generated/dataModel";
import { useCustomer } from "@/hooks/auth";
import { useAsyncLoader } from "@/hooks/use-loader";
import { safeArray, serialNo } from "@/lib/data.helpers";
import { getErrorMessage } from "@/lib/error.helpers";
import { cn } from "@/lib/utils";
import { CustomerAvatar } from "./customers";
import {
  EmptyState,
  EmptyStateConceal,
  EmptyStateContent,
  EmptyStateDescription,
  EmptyStateTitle,
} from "./empty-state";
import { FeatureRequestDialog } from "./FeatureRequestDialog";
import { RoleHasCSR } from "./RoleHasCSR";
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
} from "./ui/alert-dialog";
import { Button } from "./ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "./ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./ui/dialog";
import { Label } from "./ui/label";
import { Skeleton } from "./ui/skeleton";
import { Textarea } from "./ui/textarea";

type Suggestion = Doc<"featureRequest"> & { voteCount: number };

const STATUS_COLORS = {
  open: "text-foreground",
  approved: "text-green-500",
  completed: "text-(--theme-color-purple)",
  rejected: "text-red-500",
} as const;

export function Feedbacks() {
  const record = useQuery(api.myFunctions.listSuggestions, {});
  const suggestions = safeArray(record?.data);

  if (record === undefined) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Customer Suggestions</CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-48" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Customer Suggestions</CardTitle>
      </CardHeader>

      <CardContent>
        <EmptyState isEmpty={suggestions.length === 0}>
          <EmptyStateContent>
            <EmptyStateTitle>No suggestions yet</EmptyStateTitle>
            <EmptyStateDescription>
              Suggestions from customers will appear here.
            </EmptyStateDescription>
          </EmptyStateContent>

          <EmptyStateConceal>
            <ul className="flex gap-1 flex-col">
              {suggestions.map((suggestion) => (
                <FeedbackItem key={suggestion._id} suggestion={suggestion} />
              ))}
            </ul>
          </EmptyStateConceal>
        </EmptyState>
      </CardContent>
    </Card>
  );
}

function ApproveDialog({
  suggestionId,
  title,
  children,
}: {
  suggestionId: Id<"featureRequest">;
  title: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [comment, setComment] = useState("");
  const approveSuggestion = useMutation(api.myFunctions.approveSuggestion);
  const { loading, attachLoader } = useAsyncLoader({ default: false });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Approve suggestion</DialogTitle>
          <DialogDescription>
            Add a comment explaining the decision for &ldquo;{title}&rdquo;.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-2">
          <Label htmlFor="comment">Comment</Label>
          <Textarea
            id="comment"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="We are working on this..."
          />
        </div>
        <DialogFooter>
          <Button
            disabled={loading.default || !comment.trim()}
            onClick={attachLoader("default", async () => {
              try {
                await approveSuggestion({
                  suggestionId,
                  comment: comment.trim(),
                });
                toast.success("Suggestion approved");
                setComment("");
                setOpen(false);
              } catch (error) {
                toast.error("Failed to approve suggestion", {
                  description: getErrorMessage(error),
                });
              }
            })}
          >
            Approve
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function CompleteAlert({
  suggestionId,
  title,
  children,
}: {
  suggestionId: Id<"featureRequest">;
  title: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const completeSuggestion = useMutation(api.myFunctions.completeSuggestion);
  const { loading, attachLoader } = useAsyncLoader({ default: false });

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>{children}</AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Mark suggestion as completed?</AlertDialogTitle>
          <AlertDialogDescription>
            This will mark{" "}
            <span className="text-foreground font-medium">
              &ldquo;{title}&rdquo;
            </span>{" "}
            as completed.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            disabled={loading.default}
            onClick={attachLoader("default", async () => {
              try {
                await completeSuggestion({ suggestionId });
                toast.success("Suggestion completed");
                setOpen(false);
              } catch (error) {
                toast.error("Failed to complete suggestion", {
                  description: getErrorMessage(error),
                });
              }
            })}
          >
            Complete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function DeleteAlert({
  suggestionId,
  title,
  children,
}: {
  suggestionId: Id<"featureRequest">;
  title: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const deleteSuggestion = useMutation(api.myFunctions.deleteSuggestion);
  const { loading, attachLoader } = useAsyncLoader({ default: false });

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>{children}</AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete suggestion?</AlertDialogTitle>
          <AlertDialogDescription>
            This will permanently delete &ldquo;{title}&rdquo; and all its
            votes.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            disabled={loading.default}
            onClick={attachLoader("default", async () => {
              try {
                await deleteSuggestion({ suggestionId });
                toast.success("Suggestion deleted");
                setOpen(false);
              } catch (error) {
                toast.error("Failed to delete suggestion", {
                  description: getErrorMessage(error),
                });
              }
            })}
          >
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function FeedbackItem({ suggestion }: { suggestion: Suggestion }) {
  const user = useCustomer({ userId: suggestion.userId });

  return (
    <li className="flex flex-col not-first:border-t py-4">
      <div className="flex gap-8 between border-gray-100 pb-2 items-center text-muted-foreground justify-between text-xs">
        <div className="flex gap-2 items-center">
          <div
            className={cn(
              "w-min border shadow-inner py-1 px-2 rounded-sm",
              STATUS_COLORS[suggestion.status],
            )}
          >
            {suggestion.status}
          </div>
        </div>

        <div className="flex gap-2 items-center">
          <div className="w-min">Votes</div>
          <div
            className={cn("w-min flex gap-2 items-center", {
              "font-semibold": suggestion.voteCount > 0,
            })}
          >
            {suggestion.voteCount < 0 ? (
              <ArrowDown size="1rem" className="text-red-500" />
            ) : (
              <ArrowUp size="1rem" className="text-green-500" />
            )}
            <span>{suggestion.voteCount}</span>
          </div>

          <RoleHasCSR privileges={["feedback:update"]}>
            {suggestion.status === "open" && (
              <ApproveDialog
                suggestionId={suggestion._id}
                title={suggestion.title}
              >
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-auto p-1 text-muted-foreground hover:text-green-600"
                >
                  <CheckCircle2 size="1rem" />
                </Button>
              </ApproveDialog>
            )}
            {suggestion.status === "approved" && (
              <CompleteAlert
                suggestionId={suggestion._id}
                title={suggestion.title}
              >
                <Button variant="ghost" size="sm" className="h-auto p-1">
                  <CheckCircle2 size="1rem" />
                </Button>
              </CompleteAlert>
            )}
          </RoleHasCSR>

          <RoleHasCSR privileges={["feedback:delete"]}>
            <DeleteAlert suggestionId={suggestion._id} title={suggestion.title}>
              <Button
                variant="ghost"
                size="sm"
                className="h-auto p-1 text-muted-foreground hover:text-destructive"
              >
                <Trash2 size="1rem" />
              </Button>
            </DeleteAlert>
          </RoleHasCSR>
        </div>
      </div>

      <h1 className="text-base text-foreground">{suggestion.title}</h1>

      <p className="text-muted-foreground text-xs leading-[2.4ex]">
        {suggestion.description}
      </p>

      {suggestion.comment && (
        <p className="text-sm mt-1 italic text-muted-foreground">
          &mdash; {suggestion.comment}
        </p>
      )}

      <div className="flex gap-8 mt-2 text-muted-foreground justify-between text-xs">
        <span
          title={`${user?.firstName} ${user?.lastName}`}
          className="flex gap-2"
        >
          <CustomerAvatar
            userId={suggestion.userId}
            className="w-4 h-4 text-[8px]"
          />
          <span>{user?.firstName}&nbsp;</span>
        </span>

        <span>
          {formatDistanceToNow(suggestion._creationTime, { addSuffix: true })}
        </span>
      </div>
    </li>
  );
}

export function VotingSection() {
  const result = useQuery(api.myFunctions.listSuggestions, {
    status: "open",
  });
  const openSuggestions = safeArray(result?.data);

  return (
    <Card className="relative">
      <Image
        alt="3d logo"
        src="/images/3d-bubble.png"
        width={500}
        height={500}
        className="absolute w-[2rem] right-8 scale-[2.2] top-0 origin-bottom"
      />
      <CardHeader>
        <CardTitle>
          Suggestions{" "}
          <span className="section-record-count">
            {serialNo(openSuggestions.length)}
          </span>
        </CardTitle>
        <CardDescription>
          Help prioritize our service improvements
        </CardDescription>
      </CardHeader>

      <CardContent className="gap-4 flex flex-col">
        <EmptyState isEmpty={openSuggestions.length === 0}>
          <EmptyStateContent>
            <EmptyStateTitle>No open suggestions</EmptyStateTitle>
            <EmptyStateDescription>
              No suggestions to vote on right now.
            </EmptyStateDescription>
          </EmptyStateContent>

          <EmptyStateConceal>
            {openSuggestions.map((suggestion) => (
              <SuggestionItem key={suggestion._id} suggestion={suggestion} />
            ))}
          </EmptyStateConceal>
        </EmptyState>
      </CardContent>

      <CardFooter className="overflow-hidden flex items-center py-3 rounded-b-xl">
        <FeatureRequestDialog>
          <Button variant="ghost" className="w-full">
            Make a suggestion
          </Button>
        </FeatureRequestDialog>
      </CardFooter>
    </Card>
  );
}

function VoteButton({
  dir,
  feedbackId,
  title,
  className,
  children,
}: {
  dir: "up" | "down";
  feedbackId: string;
  title: string;
  className?: string;
  children: React.ReactNode;
}) {
  const takeVote = useMutation(api.myFunctions.voteFeatureRequest);
  const { loading: isPending, attachLoader } = useAsyncLoader({
    default: false,
  });

  return (
    <button
      type="button"
      disabled={isPending.default}
      title={title}
      className={cn("cursor-pointer text-muted-foreground", className)}
      onClick={attachLoader("default", async () => {
        const direction = dir === "up" ? 1 : -1;
        await takeVote({ entityId: feedbackId, value: direction });
      })}
    >
      {children}
    </button>
  );
}

function SuggestionItem({ suggestion }: { suggestion: Suggestion }) {
  return (
    <div className="flex group gap-6">
      <div className="flex flex-col mt-1 gap-1 self-start text-base items-center">
        <VoteButton
          dir="up"
          feedbackId={suggestion._id}
          title="I support this"
          className="hover:text-green-500"
        >
          <ArrowBigUp size="1em" />
        </VoteButton>

        <span className="font-mono text-[0.8em]">{suggestion.voteCount}</span>

        <VoteButton
          dir="down"
          feedbackId={suggestion._id}
          title="I don't support this"
          className="hover:text-red-500"
        >
          <ArrowBigDown size="1em" />
        </VoteButton>
      </div>

      <div className="flex flex-col gap-0.5 flex-1 group-last:border-0 border-b pb-8">
        <h6 className="font-semibold">{suggestion.title}</h6>
        <p className="text-sm">{suggestion.description}</p>
        <p className="text-sm text-muted-foreground">
          {formatDistanceToNow(suggestion._creationTime, { addSuffix: true })}
        </p>
      </div>
    </div>
  );
}

export function SuggestionsFAB() {
  const [isOpen, setIsOpen] = useState(false);

  const toggle = () => setIsOpen((e) => !e);

  return (
    <div className="flex items-end justify-end fixed bottom-4 right-4">
      <motion.div
        layout
        transition={{ ease: "easeInOut", duration: !isOpen ? 0 : 0.4 }}
        className="min-w-[3.2rem] min-h-[3.2rem] border shadow-lg bg-background relative rounded-2xl overflow-hidden"
      >
        {isOpen ? (
          <div className="flex flex-col max-w-sm p-4 gap-4">
            <Button
              size="icon"
              variant="outline"
              className="self-end absolute"
              onClick={toggle}
            >
              <XIcon />
            </Button>

            <div className="flex flex-col gap-[0.5rem]">
              <h1 className="text-lg font-semibold text-start">
                Need something?
              </h1>

              <p className="text-base text-balance text-muted-foreground">
                Share your ideas—your suggestion could be our next feature.
              </p>
              <div className="mt-2" />
            </div>

            <div className="-mx-2 -mb-2 flex flex-col">
              <FeatureRequestDialog>
                <Button variant="outline" className="w-full">
                  Make a suggestion
                </Button>
              </FeatureRequestDialog>
            </div>
          </div>
        ) : null}
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: isOpen ? 0 : 1 }}
        className="absolute right-0"
      >
        <button
          type="button"
          className="w-[3.2rem] flex justify-center items-center aspect-square"
          onClick={toggle}
        >
          <LightbulbIcon size="1.4rem" />
        </button>
      </motion.div>
    </div>
  );
}
