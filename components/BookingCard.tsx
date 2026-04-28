import { SeatBadge } from "@/app/reserve/components/seats";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Doc } from "@/convex/_generated/dataModel";
import { safeArray } from "@/lib/data.helpers";
import { DateParse } from "@/lib/date.helpers";
import { O } from "@/lib/fp.helpers";
import { cn } from "@/lib/utils";
import { pipe } from "effect";
import { CalendarIcon, RockingChair } from "lucide-react";
import { RangePreviewSimple } from "./BookingCalendar";
import { CustomerAvatar } from "./customers";

type BookingWithDetails = Omit<Doc<"bookings">, "startDate" | "endDate"> & {
  _id: string | undefined;
  startDate: string;
  endDate: string;
  seats: Doc<"seats">[];
  user: {
    id?: string;
    name: string;
    email: string | undefined;
  } | null;
};

export function BookingCard({
  booking,
  onClick,
}: { booking: BookingWithDetails; onClick?: () => void }) {
  const seats = safeArray(booking.seats);

  return (
    <Card onClick={onClick} className={cn({ "cursor-pointer": onClick })}>
      <CardHeader className="flex flex-row justify-between items-center">
        <CardTitle className="uppercase mb-0">
          #{booking._id.slice(0, 6)}
        </CardTitle>
        <Badge
          variant={booking.status === "confirmed" ? "success" : "destructive"}
        >
          {booking.status}
        </Badge>
      </CardHeader>

      <CardContent className="gap-4 text-sm flex flex-col">
        <div className="flex gap-4 items-start">
          <div className="w-8 h-8 flex items-center justify-center">
            <CalendarIcon />
          </div>

          {pipe(
            O.all([
              DateParse.parse(booking.startDate),
              DateParse.parse(booking.endDate),
            ]),
            O.map(([start, end]) => {
              return (
                <RangePreviewSimple
                  key={"pair"}
                  variant="sm"
                  startDate={start}
                  endDate={end}
                />
              );
            }),
            O.getOrElse(() => {
              return (
                <p className="text-sm">
                  Error rendering Preview. Start date or end date is invalid.
                </p>
              );
            }),
          )}
        </div>

        <div className="flex gap-4 items-center">
          <div className="w-8 h-8 flex items-center justify-center">
            <RockingChair />
          </div>

          <div className="flex flex-wrap gap-2">
            {seats.length > 0 ? (
              seats.map((seat: Doc<"seats">) => (
                <SeatBadge key={seat._id}>{seat.seatNumber}</SeatBadge>
              ))
            ) : (
              <span>No selected seats</span>
            )}
          </div>
        </div>

        <div className="flex gap-4 items-center">
          <CustomerAvatar userId={booking.user?.id ?? ""} className="size-8" />
          <div className="flex flex-col text-sm text-foreground">
            {booking.user?.name}
          </div>
        </div>

        <div className="flex-1" />

        <div className="mt-4 border-t pt-2 -mb-2 flex justify-end text-lg font-bold tabular-nums text-foreground items-center">
          ₦{new Intl.NumberFormat().format(booking.amount / 100)}
        </div>
      </CardContent>
    </Card>
  );
}
