"use client";
import { useMutation } from "convex/react";
import { Cake } from "lucide-react";
import * as React from "react";
import { toast } from "sonner";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { api } from "@/convex/_generated/api";
import { useProfile } from "@/hooks/auth";
import {
  buildBirthday,
  daysInMonth,
  isBirthdayAskQuiet,
  MONTHS,
} from "@/lib/birthday";
import { getErrorMessage } from "@/lib/error.helpers";

const birthdaySchema = z
  .object({
    month: z.string().min(1, { message: "Pick a month" }),
    day: z.string().min(1, { message: "Pick a day" }),
  })
  .refine((values) => Number(values.day) <= daysInMonth(values.month), {
    message: "That day does not exist in that month",
    path: ["day"],
  });

const LAST_DISMISSED_KEY = "birthday-prompt:last-dismissed";

const paddedDay = (day: number) => String(day).padStart(2, "0");

type BirthdayPromptBodyProps = {
  onSave: (birthday: string) => void;
};

/** The ask itself: month/day picks plus the dismiss escape hatch. */
export function BirthdayPromptBody(props: BirthdayPromptBodyProps) {
  const [values, setValues] = React.useState({ month: "", day: "" });

  const days = Array.from({ length: daysInMonth(values.month) }, (_, i) =>
    paddedDay(i + 1),
  );

  const pickMonth = (month: string) =>
    setValues((prev) => ({
      month,
      // A day picked for a 31-day month may not exist in the new one.
      day: Number(prev.day) > daysInMonth(month) ? "" : prev.day,
    }));

  const save = () => {
    const parsed = birthdaySchema.safeParse(values);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0].message);
      return;
    }
    props.onSave(buildBirthday(parsed.data.month, parsed.data.day));
  };

  return (
    <>
      <DialogHeader>
        <Cake className="h-8 w-8 text-amber-500" />

        <DialogTitle className="flex items-center gap-2">
          Is this your birth month?
        </DialogTitle>

        <DialogDescription className="text-pretty">
          Share your birthday with us! We&apos;d love to celebrate with you the InSpace way when your special day arrives.
        </DialogDescription>
      </DialogHeader>

      <div className="flex  *:flex-1 gap-2 mb-12">
        <Select value={values.month} onValueChange={pickMonth}>
          <SelectTrigger>
            <SelectValue placeholder="Month" />
          </SelectTrigger>
          <SelectContent>
            {MONTHS.map((m) => (
              <SelectItem key={m.value} value={m.value}>
                {m.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={values.day}
          onValueChange={(day) => setValues((prev) => ({ ...prev, day }))}
        >
          <SelectTrigger>
            <SelectValue placeholder="Day" />
          </SelectTrigger>
          <SelectContent>
            {days.map((day) => (
              <SelectItem key={day} value={day}>
                {Number(day)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex gap-2">
        <Button className="flex-1" onClick={save}>
          Save birthday
        </Button>
      </div>
    </>
  );
}

/**
 * Dialog ask for members who signed up before birthdays were captured. Opens
 * once on the account screen; a dismissal is remembered for a month, then the
 * ask returns — monthly, until a birthday is set.
 */
export function BirthdayPrompt() {
  const { data: profile } = useProfile();
  const [dismissed, setDismissed] = React.useState(() => {
    const lastDismissed = Number(
      globalThis.localStorage?.getItem(LAST_DISMISSED_KEY) ?? "0",
    );
    return isBirthdayAskQuiet(lastDismissed, Date.now());
  });

  const setBirthday = useMutation(api.myFunctions.setMyBirthday);

  if (profile === undefined) return null;
  if (!profile || profile.birthday || dismissed) return null;

  const save = async (birthday: string) => {
    try {
      await setBirthday({ birthday });
      toast.success("Birthday saved — we'll celebrate with you!");
    } catch (error) {
      toast.error(getErrorMessage(error as Error));
    }
  };

  const dismiss = () => {
    globalThis.localStorage?.setItem(LAST_DISMISSED_KEY, String(Date.now()));
    setDismissed(true);
  };

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) dismiss();
      }}
    >
      <DialogContent className="max-w-sm!">
        <BirthdayPromptBody onSave={save} />
      </DialogContent>
    </Dialog>
  );
}
