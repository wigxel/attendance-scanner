"use client";

import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { currencyFormatter } from "@/lib/currency.helpers";
import { useQuery } from "convex/react";
import { format, parseISO, subMonths } from "date-fns";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { CONVEX_SITE_URL } from "@/config/constants";
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  DownloadIcon,
  FileDown,
  Filter,
  Info,
} from "lucide-react";

const formatAmount = (amount: number) => currencyFormatter.format(amount / 100); // Convert from kobo to naira

const formatDate = (timestamp: number) =>
  format(new Date(timestamp), "MMM d, yyyy");

const durationLabels: Record<string, string> = {
  day: "Day",
  week: "Week",
  month: "Month",
};

type BookingWithCustomer = {
  _id: Id<"bookings">;
  userId: string;
  duration: number;
  startDate: string;
  endDate: string;
  durationType: "day" | "week" | "month";
  pricePerSeat: number;
  amount: number;
  status: "pending" | "confirmed" | "cancelled" | "expired";
  createdAt: number;
  updatedAt: number;
  user: {
    id: string;
    name: string;
    email: string | null;
  };
};

type MonthlyReservationsResponse = {
  overflow: boolean;
  bookings: BookingWithCustomer[];
};

export function MonthlyReservationsTable() {
  const [currentMonth, setCurrentMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  });
  const [durationType, setDurationType] = useState<
    "day" | "week" | "month" | "all"
  >("all");
  const [overflow, setOverflow] = useState(false);

  const data = useQuery(api.bookings.getMonthlyReservations, {
    month: currentMonth,
    durationType: durationType,
    overflow: overflow,
  }) as MonthlyReservationsResponse | null;

  const isLoading = data === null;

  const handlePrevMonth = () => {
    const [year, month] = currentMonth.split("-").map(Number);
    const date = new Date(year, month - 1, 1);
    date.setMonth(date.getMonth() - 1);
    setCurrentMonth(
      `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`,
    );
  };

  const handleNextMonth = () => {
    const [year, month] = currentMonth.split("-").map(Number);
    const date = new Date(year, month - 1, 1);
    date.setMonth(date.getMonth() + 1);
    setCurrentMonth(
      `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`,
    );
  };

  const handleMonthSelect = (monthsAgo: number) => {
    const date = subMonths(new Date(), monthsAgo);
    setCurrentMonth(
      `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`,
    );
  };

  const monthLabel = () => {
    const date = parseISO(`${currentMonth}-01`);
    return format(date, "MMMM yyyy");
  };

  const handleExport = () => {
    const params = new URLSearchParams({
      month: currentMonth,
      durationType,
      overflow: overflow.toString(),
    });

    window.open(
      `${CONVEX_SITE_URL}/exports/monthly-reservations?${params}`,
      "_blank",
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handlePrevMonth}>
            <ChevronLeft className="h-4 w-4" />
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="min-w-[120px]">
                {monthLabel()} <ChevronDown className="ml-2 h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuItem onClick={() => handleMonthSelect(0)}>
                This Month
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleMonthSelect(1)}>
                Last Month
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleMonthSelect(2)}>
                2 Months Ago
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleMonthSelect(3)}>
                3 Months Ago
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Button variant="outline" size="sm" onClick={handleNextMonth}>
            <ChevronRight className="h-4 w-4" />
          </Button>

          <TooltipProvider delayDuration={200}>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center gap-2">
                  <span className="text-sm">Show overflow</span>
                  <Switch checked={overflow} onCheckedChange={setOverflow} />
                </div>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="max-w-[250px]">
                <p>
                  Show reservations that started in this month but ended in a
                  different month (e.g., a monthly pass starting April 15 and
                  ending May 15).
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>

        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <Filter className="mr-2 h-4 w-4" />
                {durationType === "all"
                  ? "All Types"
                  : durationLabels[durationType]}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setDurationType("all")}>
                All Types
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setDurationType("day")}>
                Day
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setDurationType("week")}>
                Week
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setDurationType("month")}>
                Month
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Button variant="default" size="sm" onClick={handleExport}>
            <DownloadIcon className="h-4 w-4" />
            Export
          </Button>
        </div>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">S/N</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Duration</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Created</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell>
                    <Skeleton className="h-4 w-8" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-32" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-16" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-20" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-24" />
                  </TableCell>
                </TableRow>
              ))
            ) : data?.bookings.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center">
                  No reservations found
                </TableCell>
              </TableRow>
            ) : (
              data?.bookings.map((booking, index) => (
                <TableRow key={booking._id}>
                  <TableCell className="font-medium">{index + 1}</TableCell>
                  <TableCell className="font-medium">
                    {booking.user.name}
                  </TableCell>
                  <TableCell>
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        booking.durationType === "day"
                          ? "bg-blue-100 text-blue-800"
                          : booking.durationType === "week"
                            ? "bg-green-100 text-green-800"
                            : "bg-purple-100 text-purple-800"
                      }`}
                    >
                      {durationLabels[booking.durationType]}
                    </span>
                  </TableCell>
                  <TableCell>{formatAmount(booking.amount)}</TableCell>
                  <TableCell>{formatDate(booking.createdAt)}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {data && data.bookings.length > 0 && (
        <div className="text-sm text-muted-foreground">
          {data.bookings.length} reservation
          {data.bookings.length !== 1 ? "s" : ""} found
        </div>
      )}
    </div>
  );
}
