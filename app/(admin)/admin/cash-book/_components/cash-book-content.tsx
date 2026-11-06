"use client";

import { useMutation, useQuery } from "convex/react";
import { format } from "date-fns";
import { type FormEvent, useMemo, useState } from "react";
import { toast } from "sonner";
import { DateRange } from "@/components/DateRange";
import {
  EmptyState,
  EmptyStateConceal,
  EmptyStateContent,
  EmptyStateDescription,
  EmptyStateTitle,
} from "@/components/empty-state";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription } from "@/components/ui/card";
import { CurrencyInput } from "@/components/ui/currency-input";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { api } from "@/convex/_generated/api";
import { currencyFormatter } from "@/lib/currency.helpers";

type ChannelTotals = {
  inKobo: number;
  outKobo: number;
  balanceKobo: number;
};

type DaySummary = {
  date: string;
  cash: ChannelTotals;
  pos: ChannelTotals;
  transfer: ChannelTotals;
};

const today = format(new Date(), "yyyy-MM-dd");

function naira(kobo: number) {
  return currencyFormatter.format(kobo / 100).replace("NGN", "₦");
}

export function CashBookContent() {
  return (
    <DateRange.Provider>
      <CashBook />
    </DateRange.Provider>
  );
}

function CashBook() {
  const { filter } = DateRange.useState();

  const [start, end] = useMemo(
    // eslint-disable-next-line react-hooks/purity
    () => filter.get_range(Date.now()),
    [filter],
  );
  const startDate = format(start, "yyyy-MM-dd");
  const endDate = format(end, "yyyy-MM-dd");

  const summary = useQuery(api.cash.dailySummary, {
    start: startDate,
    end: endDate,
  });

  if (!summary) return <Skeleton className="h-[60svh] w-full" />;

  const isEmpty = summary.days.length === 0;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-medium text-foreground">Cash book</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Money in and out, by channel. Every balance is worked out from the
            movement list, never stored.
          </p>
        </div>
        <DateRange.Dropdown />
      </div>

      <div className="grid grid-cols-2 gap-2 md:grid-cols-4 md:gap-4">
        <SummaryCard
          label="Cash on hand"
          value={naira(summary.cashOnHandKobo)}
          hint="Till cash in minus till cash out"
        />
        <SummaryCard
          label="Cash in this range"
          value={naira(summary.totals.cash.inKobo)}
          hint={`${naira(summary.totals.cash.outKobo)} paid out`}
        />
        <SummaryCard
          label="POS in this range"
          value={naira(summary.totals.pos.inKobo)}
          hint="Settles to the bank"
        />
        <SummaryCard
          label="Transfer in this range"
          value={naira(summary.totals.transfer.inKobo)}
          hint={`${naira(summary.totals.transfer.outKobo)} paid to suppliers`}
        />
      </div>

      <PosTakingsForm />

      <EmptyState isEmpty={isEmpty}>
        <EmptyStateContent>
          <EmptyStateTitle>No money recorded</EmptyStateTitle>
          <EmptyStateDescription>
            Nothing moved through the till, POS or bank in this range.
          </EmptyStateDescription>
        </EmptyStateContent>
        <EmptyStateConceal>
          <DaysTable days={summary.days} />
        </EmptyStateConceal>
      </EmptyState>
    </div>
  );
}

function SummaryCard(props: { label: string; value: string; hint: string }) {
  return (
    <Card>
      <CardContent className="flex flex-col gap-2 pt-4">
        <CardDescription>{props.label}</CardDescription>
        <span className="text-2xl font-semibold">{props.value}</span>
        <span className="text-xs text-muted-foreground">{props.hint}</span>
      </CardContent>
    </Card>
  );
}

function PosTakingsForm() {
  const recordPosTakings = useMutation(api.cash.recordPosTakings);

  const [date, setDate] = useState(today);
  const [total, setTotal] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const totalKobo = Math.round(Number(total || 0) * 100);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);

    try {
      await recordPosTakings({ date, totalKobo });
      toast.success("POS total saved");
      setTotal("");
    } catch (error) {
      toast.error("Could not save the POS total", {
        description: error instanceof Error ? error.message : undefined,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card>
      <CardContent className="pt-4">
        <form
          onSubmit={onSubmit}
          className="flex flex-wrap items-end gap-4"
          aria-label="Record POS takings"
        >
          <div className="space-y-2">
            <Label htmlFor="pos-date">Day</Label>
            <Input
              id="pos-date"
              type="date"
              value={date}
              max={today}
              onChange={(event) => setDate(event.target.value)}
              className="w-40"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="pos-total">Terminal total</Label>
            <CurrencyInput
              id="pos-total"
              value={total}
              onChange={setTotal}
              variant="keyboard"
              placeholder="0.00"
              required
            />
          </div>

          <Button type="submit" disabled={isSubmitting || totalKobo === 0}>
            {isSubmitting ? "Saving..." : "Save POS total"}
          </Button>

          <p className="basis-full text-xs text-muted-foreground">
            The terminal reports one total for the day, so enter it once. Saving
            the same day again corrects it instead of adding a second entry.
          </p>
        </form>
      </CardContent>
    </Card>
  );
}

function DaysTable(props: { days: DaySummary[] }) {
  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Day</TableHead>
            <TableHead className="text-right">Cash in</TableHead>
            <TableHead className="text-right">Cash out</TableHead>
            <TableHead className="text-right">Cash balance</TableHead>
            <TableHead className="text-right">POS in</TableHead>
            <TableHead className="text-right">Transfer in</TableHead>
            <TableHead className="text-right">Transfer out</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {props.days.map((day) => (
            <TableRow key={day.date}>
              <TableCell>
                {format(new Date(`${day.date}T00:00:00`), "d MMM, yy")}
              </TableCell>
              <TableCell className="text-right">
                {naira(day.cash.inKobo)}
              </TableCell>
              <TableCell className="text-right">
                {naira(day.cash.outKobo)}
              </TableCell>
              <TableCell className="text-right font-medium">
                {naira(day.cash.balanceKobo)}
              </TableCell>
              <TableCell className="text-right">
                {naira(day.pos.inKobo)}
              </TableCell>
              <TableCell className="text-right">
                {naira(day.transfer.inKobo)}
              </TableCell>
              <TableCell className="text-right">
                {naira(day.transfer.outKobo)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
