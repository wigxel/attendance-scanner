"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { useAction, useQuery } from "convex/react";
import { format, parseISO, subMonths } from "date-fns";
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  DownloadIcon,
  Filter,
} from "lucide-react";
import { AppSpinner } from "@/components/loader";
import { useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
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
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { currencyFormatter } from "@/lib/currency.helpers";
import { cn } from "@/lib/utils";
import { AttendanceDrawer } from "./AttendanceDrawer";
import { AppDataTable, AppTableActions } from "./DataTable";
import { DeleteBookingDialog } from "./DeleteBookingDialog";
import { RoleHasCSR } from "./RoleHasCSR";
import { EmptyStateContent, EmptyStateTitle } from "./empty-state";
import { Card } from "./ui/card";

const formatAmount = (amount: number) => currencyFormatter.format(amount / 100);

const formatDate = (timestamp: number) =>
  format(new Date(timestamp), "MMM d, yyyy");

const formatISODate = (dateStr: string) =>
  format(parseISO(dateStr), "MMM d, yyyy");

const durationLabels: Record<string, string> = {
  day: "Day",
  week: "Week",
  month: "Month",
};

const statusLabels: Record<string, string> = {
  pending: "Pending",
  confirmed: "Confirmed",
  cancelled: "Cancelled",
  expired: "Expired",
  "used-up": "Used Up",
};

const statusVariant: Record<
  BookingWithCustomer["status"],
  "success" | "info" | "secondary" | "destructive" | "outline"
> = {
  confirmed: "success",
  "used-up": "info",
  pending: "secondary",
  cancelled: "destructive",
  expired: "outline",
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
  status: "pending" | "confirmed" | "cancelled" | "expired" | "used-up";
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

type DurationType = "day" | "week" | "month" | "all";

const columns: ColumnDef<BookingWithCustomer>[] = [
  {
    header: "S/N",
    id: "sn",
    cell: ({ row }) => <span className="font-medium">{row.index + 1}</span>,
  },
  {
    header: "Customer",
    accessorKey: "user.name",
    cell: ({ row }) => (
      <span className="font-medium">{row.original.user.name}</span>
    ),
  },
  {
    header: "Duration",
    id: "durationType",
    accessorKey: "durationType",
    cell: ({ row }) => {
      const dt = row.original.durationType;
      return (
        <span
          className={cn(
            "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
            dt === "day"
              ? "bg-blue-100 text-blue-800"
              : dt === "week"
                ? "bg-green-100 text-green-800"
                : "bg-purple-100 text-purple-800",
          )}
        >
          {durationLabels[dt]}
        </span>
      );
    },
  },
  {
    header: "Start Date",
    accessorKey: "startDate",
    cell: ({ row }) => formatISODate(row.original.startDate),
  },
  {
    header: "End Date",
    accessorKey: "endDate",
    cell: ({ row }) => formatISODate(row.original.endDate),
  },
  {
    header: "Amount",
    accessorKey: "amount",
    cell: ({ row }) => formatAmount(row.original.amount),
  },
  {
    header: "Status",
    accessorKey: "status",
    id: "status",
    cell: ({ row }) => (
      <Badge variant={statusVariant[row.original.status]}>
        {statusLabels[row.original.status]}
      </Badge>
    ),
  },
  {
    header: "Created",
    accessorKey: "createdAt",
    cell: ({ row }) => formatDate(row.original.createdAt),
  },
  {
    header: "",
    id: "actions",
    cell: ({ row }) => {
      return (
        <AppTableActions>
          <RoleHasCSR privileges={["booking:delete"]}>
            <DeleteBookingDialog bookingId={row.original._id} />
          </RoleHasCSR>
        </AppTableActions>
      );
    },
  },
];

export function MonthlyReservationsTable() {
  const [currentMonth, setCurrentMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  });
  const [durationType, setDurationType] = useState<DurationType>("all");
  const [overflow, setOverflow] = useState(false);
  const [selectedBookingId, setSelectedBookingId] =
    useState<Id<"bookings"> | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const data = useQuery(api.bookings.getMonthlyReservations, {
    month: currentMonth,
    durationType: durationType,
    overflow: overflow,
  }) as MonthlyReservationsResponse | null;

  const exportAction = useAction(api.bookings.exportMonthlyReservations);
  const [isExporting, setIsExporting] = useState(false);

  const isLoading = data === null;
  const bookings = data?.bookings ?? [];

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const result = await exportAction({
        month: currentMonth,
        durationType,
        overflow,
      });

      if (result?.storageUrl) {
        window.open(result.storageUrl, "_blank");
      } else {
        toast.error("Export failed: No storage URL returned");
      }
    } catch (error) {
      console.error("Export failed:", error);
    } finally {
      setIsExporting(false);
    }
  };

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

  const handleRowClick = (row: BookingWithCustomer) => {
    setSelectedBookingId(row._id);
    setIsDrawerOpen(true);
  };

  return (
    <div className="space-y-4">
      {isLoading ? (
        <>
          <Skeleton className="h-10 w-full" />
          <Card>
            <Skeleton className="h-[50svh] w-full" />
          </Card>
        </>
      ) : (
        <>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex flex-wrap md:flex-nowrap items-center gap-2">
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
                      <Switch
                        checked={overflow}
                        onCheckedChange={setOverflow}
                      />
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="max-w-[250px]">
                    <p>
                      Show reservations that started in this month but ended in
                      a different month (e.g., a monthly pass starting April 15
                      and ending May 15).
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>

            <div className="flex items-center self-stretch gap-2">
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

              <Button
                variant="default"
                size="sm"
                onClick={handleExport}
                disabled={isExporting}
              >
                {isExporting ? (
                  <>
                    <AppSpinner />
                    Exporting...
                  </>
                ) : (
                  <>
                    <DownloadIcon className="size-4" />
                    Export
                  </>
                )}
              </Button>
            </div>
          </div>

          <AppDataTable
            columns={columns}
            data={bookings}
            onRowClick={handleRowClick}
            emptyState={
              <EmptyStateContent>
                <EmptyStateTitle>No reservations found</EmptyStateTitle>
              </EmptyStateContent>
            }
          />

          <AttendanceDrawer
            bookingId={selectedBookingId}
            isOpen={isDrawerOpen}
            onClose={() => {
              setIsDrawerOpen(false);
              setSelectedBookingId(null);
            }}
          />
        </>
      )}
    </div>
  );
}
