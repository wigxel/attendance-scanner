"use client";
import { useMutation, useQuery } from "convex/react";
import {
  differenceInDays,
  differenceInHours,
  differenceInMinutes,
  differenceInSeconds,
  formatISO,
  isToday,
  parseISO,
  setHours,
} from "date-fns";
import { Match, Option, pipe } from "effect";
import { range } from "effect/Array";
import { intersperse } from "effect/Iterable";
import { isNullable } from "effect/Predicate";
import {
  ChevronLeft,
  ChevronRight,
  Crown,
  Gift,
  InfoIcon,
  Package2Icon,
  PackageIcon,
  ReceiptIcon,
} from "lucide-react";
import { motion } from "motion/react";
import { useRouter } from "next/navigation";
import * as React from "react";
import useEvent from "react-use-event-hook";
import { toast } from "sonner";
import { useMediaQuery } from "usehooks-ts";
import { Drawer } from "vaul";
import { createColumns } from "@/components/columns";
import { AppDataTable } from "@/components/DataTable";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { api } from "@/convex/_generated/api";
import {
  type AccessDuration,
  type AccessStruct,
  PlanImpl,
} from "@/convex/shared";
import { useCustomer } from "@/hooks/auth";
import { safeArray, safeNum, serialNo } from "@/lib/data.helpers";
import { DateParse } from "@/lib/date.helpers";
import { getErrorMessage } from "@/lib/error.helpers";
import { O } from "@/lib/fp.helpers";
import { cn } from "@/lib/utils";
import { CustomerSheet } from "./customer-info";
import { DateRange } from "./DateRange";
import { DebugClick } from "./debug-click";
import {
  EmptyState,
  EmptyStateConceal,
  EmptyStateContent,
  EmptyStateDescription,
  EmptyStateTitle,
} from "./empty-state";
import { ManualBookingForm } from "./forms/ManualBookingForm";
import { If } from "./if";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { ScrollArea } from "./ui/scroll-area";
import { Skeleton } from "./ui/skeleton";

const defaultPaginationOpts = {
  numItems: 50,
  cursor: null as string | null,
};

export function useUsers(searchTerm = "") {
  const [paginationOpts, setPaginationOpts] = React.useState(
    defaultPaginationOpts,
  );

  const record = useQuery(api.myFunctions.getAllUsers, {
    paginationOpts,
    search: searchTerm,
  });

  const loadMore = React.useCallback(() => {
    if (record && !record.isDone && record.continueCursor) {
      setPaginationOpts((prev) => ({
        ...prev,
        cursor: record.continueCursor ?? null,
      }));
    }
  }, [record]);

  return {
    data: record?.page ?? [],
    isDone: record?.isDone ?? false,
    hasMore: !record?.isDone,
    loadMore,
    record,
  };
}

/*
  @todo: Add Visit History
  @todo:
*/
export function CustomersTable() {
  const [searchTerm, setSearchTerm] = React.useState("");
  const debouncedSearch = React.useDeferredValue(searchTerm);
  const { data: users, record } = useUsers(debouncedSearch);
  const isLoading = record === undefined;
  const [selectedUserId, setSelectedUserId] = React.useState<string | null>(
    null,
  );
  const [bookingUserId, setBookingUserId] = React.useState<string | null>(null);
  const [bookingUserName, setBookingUserName] = React.useState<string>("");
  const [isBookingLoading, setIsBookingLoading] = React.useState(false);

  const router = useRouter();

  const createBooking = useMutation(api.bookings.createManualBooking);

  const handleViewProfile = useEvent((userId: string) => {
    setTimeout(() => {
      setSelectedUserId(userId);
    }, 16);
  });

  const handleCreateBooking = useEvent((userId: string, userName: string) => {
    setTimeout(() => {
      setBookingUserId(userId);
      setBookingUserName(userName);
    }, 16);
  });

  const handleCreateBookingWithSeat = useEvent((userId: string) => {
    router.push(`/admin/bookings/create?userId=${userId}`);
  });

  const handleBookingSubmit = useEvent(
    async (values: { planKey: string; startDate: string }) => {
      if (!bookingUserId) return;
      setIsBookingLoading(true);

      try {
        await createBooking({
          userId: bookingUserId,
          planKey: values.planKey,
          startDate: values.startDate,
        });
        setBookingUserId(null);
        toast.success("Booking created successfully");
      } catch (error) {
        toast.error("Error making reservation", {
          description: getErrorMessage(error),
          duration: 40000,
        });
      } finally {
        setIsBookingLoading(false);
      }
    },
  );

  const tableColumns = React.useMemo(
    () =>
      createColumns({
        onViewProfile: handleViewProfile,
        onCreateBooking: handleCreateBooking,
        onCreateBookingWithSeat: handleCreateBookingWithSeat,
      }),
    [handleViewProfile, handleCreateBooking, handleCreateBookingWithSeat],
  );

  if (!users) {
    return <div>Loading...</div>;
  }

  return (
    <div className="p-4">
      <AppDataTable
        columns={tableColumns}
        data={users.map((user) => ({
          ...user,
          firstname: user.firstName,
          lastname: user.lastName,
        }))}
        searchTerm={debouncedSearch}
        onSearchChange={setSearchTerm}
        isLoading={isLoading}
      />

      <CustomerSheet
        userId={selectedUserId}
        open={!!selectedUserId}
        onOpenChange={(open) => !open && setSelectedUserId(null)}
      />

      <Dialog
        open={!!bookingUserId}
        onOpenChange={(open) => !open && setBookingUserId(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Booking</DialogTitle>
            <DialogDescription>
              Create a manual booking for {bookingUserName}
            </DialogDescription>
          </DialogHeader>

          <ManualBookingForm
            userName={bookingUserName}
            isLoading={isBookingLoading}
            onSubmit={handleBookingSubmit}
            onCancel={() => setBookingUserId(null)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}

function useAttendanceRegister() {
  const today = React.useMemo(() => {
    const today = new Date();
    const start = formatISO(setHours(today, 0));
    const end = formatISO(setHours(today, 23));

    return { start, end };
  }, []);

  const [current, setCurrent] = React.useState(() => today);

  const createDateRange = useEvent((date: Date) => ({
    start: formatISO(setHours(date, 0)),
    end: formatISO(setHours(date, 23)),
  }));

  const adjustDate = React.useCallback(
    (days: number) => {
      setCurrent((prev) => {
        const newDate = new Date(parseISO(prev.start));
        newDate.setDate(newDate.getDate() + days);
        return createDateRange(newDate);
      });
    },
    [createDateRange],
  );

  const incrementBy = React.useCallback(
    (days: number) => adjustDate(days),
    [adjustDate],
  );
  const decrementBy = React.useCallback(
    (days: number) => adjustDate(-days),
    [adjustDate],
  );

  return {
    isToday: isToday(current.start),
    current: current,
    incrementBy,
    decrementBy,
  };
}

type DailyRegisterEntry = {
  _id: string;
  _creationTime: number;
  userId: string;
  timestamp: string;
  source: "web";
  device: { browser: string; name: string; visitorId: string };
  access: AccessStruct;
  admitted_by: string;
  ticketId?: string;
};

export function TodaysCustomers() {
  const attendanceHandler = useAttendanceRegister();

  const records = safeArray(
    useQuery(api.myFunctions.getDailyRegister, {
      ...attendanceHandler.current,
    }),
  ) as DailyRegisterEntry[];

  return (
    <Card className="min-h-[32rem]">
      <CardHeader className="flex flex-row items-center space-y-0">
        <CardTitle className="flex-1">
          <span>
            <If cond={attendanceHandler.isToday}>Today&apos;s Scan</If>

            <If cond={!attendanceHandler.isToday}>
              {DateParse.presets
                .dateOnly(attendanceHandler.current.start)
                .pipe(O.getOrElse(() => "--"))}
            </If>
          </span>
          <span className="section-record-count">
            &nbsp;— {serialNo(records.length)}
          </span>
        </CardTitle>

        <div className="flex gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => attendanceHandler.decrementBy(1)}
            className="h-8 w-8 rounded-full"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={() => attendanceHandler.incrementBy(1)}
            className="h-8 w-8 rounded-full"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>

      <EmptyState isEmpty={records.length === 0}>
        <EmptyStateContent className="px-4">
          <EmptyStateTitle className="text-start w-full">
            No scans yet
          </EmptyStateTitle>
          <EmptyStateDescription className="text-start w-full">
            You&apos;ll see all scanned <br /> customers for today here
          </EmptyStateDescription>
        </EmptyStateContent>

        <EmptyStateConceal>
          <CardContent className="p-0">
            <ScrollArea>
              <ul className="h-[32rem]">
                {records.map((e) => {
                  return <RegisteredUserEntry entry={e} key={e._id} />;
                })}
              </ul>
            </ScrollArea>
          </CardContent>
        </EmptyStateConceal>
      </EmptyState>
    </Card>
  );
}

function useVisitCount({ userId }: { userId: string }) {
  const response = useQuery(api.myFunctions.registrationCount, {
    userId: userId,
  });

  return Option.fromNullable(response);
}

export function CustomerAvatar({
  userId,
  className = "w-8 h-8",
}: {
  userId: string;
  className?: string;
}) {
  const user = useCustomer({ userId }) ?? { firstName: "", lastName: "" };

  return (
    <Avatar className={cn(className, "select-none")}>
      <AvatarImage
        src={"undefined"}
        alt="User Avatar"
        className="object-cover"
      />
      <AvatarFallback>{CustomerImpl.initials(user)}</AvatarFallback>
    </Avatar>
  );
}

export function RegisteredUserEntry({
  entry,
  onSelect,
}: {
  entry: Partial<DailyRegisterEntry> & { userId: string; timestamp: string };
  onSelect?: (
    entry: Partial<DailyRegisterEntry> & { userId: string; timestamp: string },
  ) => void;
}) {
  const user = useCustomer({ userId: entry.userId }) ?? {
    firstName: "",
    lastName: "",
  };
  const visitCount = useVisitCount({ userId: entry.userId });
  const diffFromNow = format_time_to_now(entry.timestamp);
  const isReservation = !isNullable(entry.ticketId);
  const can_modify_plan = isReservation
    ? false
    : // eslint-disable-next-line react-hooks/purity
      differenceInHours(Date.now(), entry.timestamp) < 24;

  const handleClick = () => {
    onSelect?.(entry);
  };

  const isMobile = useMediaQuery(
    "(max-width: 768px) and (orientation: portrait)",
    { defaultValue: true },
  );

  if (!user) return <p>No user found</p>;

  const content = (
    <li>
      <DebugClick input={() => ({ isReservation, entry, user })}>
        <div className="flex w-full group items-center hover:bg-background group gap-4 pt-2 px-4 cursor-pointer">
          <CustomerAvatar userId={entry.userId} className="w-10 h-10" />

          <div className="group-last:border-none border-b flex items-center flex-1 pb-2">
            <div className="flex-1 flex-col gap-1 flex">
              <div className="font-semibold">
                {user.firstName} {user.lastName}
              </div>

              <div className="flex gap-2 text-xs text-gray-500 font-mono">
                <PaymentBadge
                  data={entry.access}
                  hasReservation={isReservation}
                />
                •
                <div>
                  {pipe(
                    visitCount,
                    Option.map(safeNum),
                    Option.map((visitCount) => {
                      return (
                        <React.Fragment key={"visit"}>
                          {serialNo(visitCount ?? 0)} visit
                          {visitCount < 2 ? "" : "s"}
                        </React.Fragment>
                      );
                    }),
                    Option.getOrElse(() => <>-- visits</>),
                  )}
                </div>
              </div>
            </div>

            <div
              className={"inline-block text-sm font-semibold text-foreground"}
            >
              {diffFromNow}
            </div>
          </div>
        </div>
      </DebugClick>
    </li>
  );

  const attendanceSettingsContent = (
    <section className="flex flex-col gap-4 mt-4">
      <li className="flex group items-center group gap-4 py-2 border-y">
        <CustomerAvatar userId={entry.userId} className="w-10 h-10 " />

        <div className="group-last:border-none flex items-center flex-1">
          <div className="flex-1 flex-col gap-1 flex">
            <div className="font-semibold">
              {user.firstName} {user.lastName}
            </div>

            <div className="flex gap-2 text-xs text-gray-500 font-mono">
              {intersperse(
                [
                  <PaymentBadge
                    key="preview"
                    data={entry.access}
                    hasReservation={isReservation}
                  />,
                  pipe(
                    Match.value(entry.access),
                    Match.whenAnd({ kind: "paid", _v: "2" }, (match) => {
                      return match.paymentMethod === "cash"
                        ? "Cash"
                        : "Transfer";
                    }),
                    Match.orElse(() => null),
                  ),
                  <div key="visit_count">
                    {pipe(
                      visitCount,
                      Option.map(safeNum),
                      Option.map((visitCount) => {
                        return (
                          <React.Fragment key={"visit"}>
                            {serialNo(visitCount ?? 0)} visit
                            {visitCount < 2 ? "" : "s"}
                          </React.Fragment>
                        );
                      }),
                      Option.getOrElse(() => <>-- visits</>),
                    )}
                  </div>,
                ].filter((_e) => _e !== null),
                <span>•</span>,
              )}
            </div>
          </div>

          <div className={"inline-block text-sm font-semibold text-foreground"}>
            {diffFromNow}
          </div>
        </div>
      </li>

      <ul className={"flex flex-col gap-4"}>
        <li className="flex justify-between items-center select-none">
          <span className="font-semibold text-sm items-center inline-flex gap-2">
            <PackageIcon size="1.2em" />
            Pricing plan
          </span>
          <AccessTypeButton
            disabled={!can_modify_plan}
            size="full"
            value={entry.access}
            id={entry.userId}
          />
        </li>

        <li className="flex justify-between items-center select-none">
          <div className="flex flex-col">
            <span className="font-semibold text-sm items-center inline-flex gap-2">
              <Package2Icon size="1.2em" />
              Work duration
            </span>
          </div>

          <PlanTypeToggle
            disabled={!can_modify_plan}
            value={entry.access}
            userId={entry.userId}
          />
        </li>

        <If cond={PlanImpl.type("paid")(entry.access) && !isReservation}>
          <li className="flex justify-between items-center select-none">
            <span className="font-semibold text-sm items-center inline-flex gap-2">
              <ReceiptIcon size="1.2em" />
              Payment method
            </span>
            <PaymentTypeToggle
              disabled={!can_modify_plan}
              id={entry.userId}
              value={
                entry.access ? PlanImpl.paymentMethod(entry.access) : undefined
              }
            />
          </li>
        </If>
      </ul>

      <If cond={isReservation}>
        <div className="mt-4 flex justify-start gap-2 select-none text-muted-foreground">
          <InfoIcon size="1em" />
          <p className="text-xs text-balance text-start">
            <span>
              Record can not be modified. Customer made a reservation.
            </span>
          </p>
        </div>
      </If>
    </section>
  );

  return (
    <>
      <Drawer.Root>
        <Drawer.Trigger
          asChild
          disabled={!isMobile}
          className="block lg:hidden cursor-pointer"
          onClick={handleClick}
        >
          {content}
        </Drawer.Trigger>

        <Drawer.Portal>
          <Drawer.Overlay className="fixed inset-0 bg-black/40" />
          <Drawer.Content className="bg-background h-[70vh] fixed bottom-0 left-0 right-0 rounded-t-[10px] outline-none p-4">
            <Drawer.Title className="font-semibold">
              Customer Attendance
            </Drawer.Title>
            <Drawer.Description className="text-sm">
              Set attendance information
            </Drawer.Description>

            {attendanceSettingsContent}
          </Drawer.Content>
        </Drawer.Portal>
      </Drawer.Root>

      <Sheet>
        <SheetTrigger
          asChild
          disabled={isMobile}
          className="hidden lg:flex cursor-pointer w-full"
          onClick={handleClick}
        >
          {content}
        </SheetTrigger>

        <SheetContent className="w-full max-w-sm px-4 py-4">
          <div>
            <SheetTitle className="font-semibold">
              Customer Attendance
            </SheetTitle>

            <SheetDescription className="text-sm">
              Set attendance information
            </SheetDescription>
          </div>

          {attendanceSettingsContent}
        </SheetContent>
      </Sheet>
    </>
  );
}

function AccessTypeButton(props: {
  id: string;
  size: "compact" | "full";
  disabled?: boolean;
  value?: Pick<AccessStruct, "kind">;
}) {
  const { id, size = "full", value: _value } = props;

  const value = _value ?? { kind: "none" };
  const isCompact = size === "compact";
  const changePlan = useMutation(api.register.updateTodaysRegisterAccess);

  const changePlan_ = (...args: Parameters<typeof changePlan>) => {
    changePlan(...args).catch((error) => {
      toast.error("Plan update failed", {
        description: getErrorMessage(error),
      });
    });
  };

  return (
    <div className="flex items-center gap-1">
      <Button
        title="Mark as Paying customer"
        size={isCompact ? "icon" : "sm"}
        disabled={props.disabled}
        variant={value.kind === "paid" ? "outline-active" : "secondary"}
        onClick={() => {
          changePlan_({ userId: id, plan: "daily" });
        }}
      >
        {isCompact ? <Crown className="h-4 w-4" /> : "Paid"}
      </Button>

      <Button
        title="Mark as Free customer"
        size={isCompact ? "icon" : "sm"}
        disabled={props.disabled}
        variant={value.kind === "free" ? "outline-active" : "secondary"}
        onClick={() => {
          changePlan_({ userId: id, plan: "free" });
        }}
      >
        {isCompact ? <Gift className="h-4 w-4" /> : "Free"}
      </Button>
    </div>
  );
}

function PaymentTypeToggle(props: {
  id: string;
  value?: "bank_transfer" | "cash";
  disabled?: boolean;
}) {
  const { id, value } = props;
  const changePlan = useMutation(api.register.updateTodaysRegisterAccess);

  const changePlan_ = (...args: Parameters<typeof changePlan>) => {
    changePlan(...args).catch((error) => {
      toast.error("Plan update failed", {
        description: getErrorMessage(error),
      });
    });
  };

  return (
    <div className="flex items-center gap-1">
      <Button
        size={"sm"}
        disabled={props.disabled}
        variant={value === "cash" ? "outline-active" : "secondary"}
        onClick={() => {
          changePlan_({ userId: id, paymentType: "cash" });
        }}
      >
        Cash
      </Button>
      <Button
        size={"sm"}
        disabled={props.disabled}
        variant={value === "bank_transfer" ? "outline-active" : "secondary"}
        onClick={() => {
          changePlan_({ userId: id, paymentType: "bank_transfer" });
        }}
      >
        Transfer
      </Button>
    </div>
  );
}

const variants = {
  hidden: { marginLeft: "-20%", transition: { duration: 0.1 } },
  visible: { marginLeft: "0%", transition: { duration: 0.2 } },
};

function PlanTypeToggle({
  userId: id,
  value,
  disabled,
}: {
  userId: string;
  value: AccessStruct | undefined;
  disabled?: boolean;
}) {
  const [showDialog, setShowDialog] = React.useState(false);

  const changePlan = useMutation(api.register.updateTodaysRegisterAccess);

  const setOption = (value: AccessDuration) => {
    changePlan({ duration: value, userId: id });
  };

  const option = PlanImpl.duration(value).pipe(
    O.getOrElse(() => ({ type: "none" as const })),
  );

  return (
    <div className="flex items-center gap-1">
      <div className="relative">
        <Button
          size={"sm"}
          variant={option.type === "hourly" ? "outline-active" : "secondary"}
          disabled={disabled}
          onClick={() => {
            setShowDialog(true);
          }}
        >
          {option.type === "hourly"
            ? `${option.value}hr${option.value > 1 ? "s" : ""}`
            : "Hourly"}
        </Button>

        {!showDialog ? null : (
          <div className="absolute top-0 right-0 gap-px bg-background p-0.5 border shadow-xl rounded-lg inline-flex justify-end">
            {range(1, 5).map((hour) => {
              const isActive =
                option.type === "hourly" && option.value === hour;

              return (
                <motion.div
                  key={hour}
                  variants={variants}
                  initial="hidden"
                  animate={!showDialog ? "hidden" : "visible"}
                >
                  <Button
                    title="Mark as Free customer"
                    size={"sm"}
                    variant={isActive ? "outline-active" : "outline"}
                    className="px-2"
                    onClick={() => {
                      setShowDialog(false);
                      setOption({ type: "hourly", value: hour });
                    }}
                  >
                    {hour}hr
                  </Button>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      <Button
        size={"sm"}
        disabled={disabled}
        variant={option.type === "fullday" ? "outline-active" : "secondary"}
        onClick={() => setOption({ type: "fullday" })}
      >
        Full-day
      </Button>
    </div>
  );
}

const map = {
  paid: "text-(--theme-color-blue)",
  free: "text-foreground",
  none: "",
  "--": "destructive",
} as const;

function PaymentBadge(props: {
  data?: AccessStruct;
  hasReservation?: boolean;
}) {
  const { data, hasReservation = false } = props;
  const _kind = data?.kind ?? "--";

  return (
    <span
      className={cn("capitalize", map[_kind], {
        "text-(--theme-color-purple)": hasReservation,
      })}
    >
      {hasReservation ? "Subscriber" : (_kind ?? "--")}
    </span>
  );
}

export const CustomerImpl = {
  initials: (customer: { firstName: string; lastName: string }) => {
    return `${customer.firstName.charAt(0)}${customer.lastName.charAt(0)}`;
  },
};

function format_time_to_now(date_: unknown) {
  const date = parseISO(String(date_));
  const current = Date.now();

  const days = differenceInDays(current, date);

  if (days >= 1) {
    return `${Math.floor(days)}d`;
  }

  const hrs = Math.abs(differenceInHours(current, date));
  if (hrs >= 1) {
    return `${hrs}h`;
  }

  const mins = differenceInMinutes(current, date);
  if (mins >= 1) {
    return `${mins}m`;
  }

  const secs = differenceInSeconds(current, date);
  if (secs >= 0) {
    return `${secs}s`;
  }

  return "now";
}

export function TopCustomersAvatarGroup() {
  const { filter: dateFilter } = DateRange.useState();

  const [startDate, endDate] = React.useMemo(
    // eslint-disable-next-line react-hooks/purity
    () => dateFilter.get_range(Date.now()),
    [dateFilter],
  );

  const topCustomers =
    useQuery(api.customers.getTopCustomers, {
      limit: 50,
      start: startDate.toISOString(),
      end: endDate.toISOString(),
      filter: "all",
    }) ?? [];

  const displayCustomers = topCustomers;
  const top6 = displayCustomers.slice(0, 6);
  const extra = Math.max(0, displayCustomers.length - top6.length);

  return (
    <EmptyState isEmpty={displayCustomers.length === 0}>
      <EmptyStateContent>
        <Button
          variant="outline"
          disabled
          className="h-auto p-2 px-4 rounded-full flex items-center justify-center"
        >
          <span className="text-xs text-muted-foreground">
            No Top Customers yet
          </span>
        </Button>
      </EmptyStateContent>

      <Sheet>
        <EmptyStateConceal>
          <SheetTrigger asChild>
            <Button
              variant="outline"
              className="h-auto p-2 pl-4 rounded-full flex items-center gap-3"
            >
              <div className="flex -space-x-3">
                {top6.map((customer, _i) => (
                  <CustomerAvatar
                    key={customer.userId}
                    userId={customer.userId}
                    className={cn(
                      "w-8 h-8 border-2 border-background ring-2 ring-transparent transition-all",
                      "hover:z-10 pointer-events-none",
                    )}
                  />
                ))}
              </div>
              <div className="flex flex-col items-start text-xs text-muted-foreground mr-2">
                <span className="font-medium text-foreground">
                  Star Customers
                </span>
                <If cond={extra > 0}>
                  <span>+{extra} more</span>
                </If>
              </div>
            </Button>
          </SheetTrigger>
        </EmptyStateConceal>

        <TopCustomersSheet />
      </Sheet>
    </EmptyState>
  );
}

function TopCustomersSheet() {
  const [filter, setFilter] = React.useState<"all" | "free" | "paid">("all");

  const { filter: dateFilter } = DateRange.useState();

  const [startDate, endDate] = React.useMemo(
    // eslint-disable-next-line react-hooks/purity
    () => dateFilter.get_range(Date.now()),
    [dateFilter],
  );

  const response = useQuery(api.customers.getTopCustomers, {
    limit: 50,
    start: startDate.toISOString(),
    end: endDate.toISOString(),
    filter: filter,
  });

  const displayCustomers = safeArray(response);

  return (
    <SheetContent
      side="right"
      className="w-full sm:max-w-md p-0 flex flex-col h-screen"
    >
      <SheetHeader className="p-6 border-b">
        <SheetTitle>Top Customers</SheetTitle>
      </SheetHeader>

      <Tabs
        value={filter}
        onValueChange={(v) => setFilter(v as typeof filter)}
        className="w-full flex flex-1 flex-col"
      >
        <div className="flex items-center justify-between px-4 gap-4">
          <TabsList>
            <TabsTrigger value="all" className="px-4">
              All
            </TabsTrigger>
            <TabsTrigger value="free" className="px-4">
              Free
            </TabsTrigger>
            <TabsTrigger value="paid" className="px-4">
              Paid
            </TabsTrigger>
          </TabsList>

          <DateRange.Dropdown />
        </div>

        <ScrollArea className="h-[80svh]">
          {response === undefined ? (
            [...Array(5)].map((_, i) => (
              <li key={i} className="flex items-center gap-4 py-4 px-4">
                <Skeleton className="w-8 h-8 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="w-24 h-4" />
                  <Skeleton className="w-16 h-3" />
                </div>
              </li>
            ))
          ) : (
            <EmptyState isEmpty={displayCustomers.length === 0}>
              <div className="flex flex-col items-center justify-center">
                <EmptyStateContent className="py-16">
                  <Crown className="w-8 h-8 text-muted-foreground" />
                  <EmptyStateTitle>No customers found</EmptyStateTitle>
                  <EmptyStateDescription>
                    No customers in this date range.
                  </EmptyStateDescription>
                </EmptyStateContent>
              </div>

              <EmptyStateConceal>
                <ul className="divide-y divide-border grow-0 shrink-1 overflow-hidden flex flex-col">
                  {displayCustomers.map((customer, i) => (
                    <li
                      key={customer.userId}
                      className="flex text-xs items-center gap-4 p-4 hover:bg-muted/50 transition-colors"
                    >
                      <div className="font-mono text-[1em] text-muted-foreground w-4 text-center">
                        {serialNo(i + 1)}
                      </div>

                      <CustomerAvatar
                        userId={customer.userId}
                        className="w-8 h-8"
                      />

                      <div className="flex-1">
                        <div className="font-semibold text-[1.2em]">
                          {customer.name}
                        </div>
                        <div className="flex items-center gap-2 text-[1em] text-muted-foreground">
                          <span>
                            {serialNo(customer.visits)} visit
                            {customer.visits === 1 ? "" : "s"}
                          </span>
                          <span
                            className={cn(
                              "px-1.5 py-0.5 rounded",
                              customer.accessPlan === "paid"
                                ? "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300"
                                : "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
                            )}
                          >
                            {customer.accessPlan}
                          </span>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              </EmptyStateConceal>
            </EmptyState>
          )}
        </ScrollArea>
      </Tabs>
    </SheetContent>
  );
}
