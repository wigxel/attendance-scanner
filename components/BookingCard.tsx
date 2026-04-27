import { SeatBadge } from "@/app/reserve/components/seats";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Doc } from "@/convex/_generated/dataModel";
import { CalendarIcon, RockingChair } from "lucide-react";
import { RangePreviewSimple } from "./BookingCalendar";
import { CustomerAvatar } from "./customers";
import { DateParse } from "@/lib/date.helpers";
import { pipe } from "effect";
import { O } from "@/lib/fp.helpers";

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
  return (
    <Card onClick={onClick} className="cursor-pointer">
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

      <CardContent className="text-muted-foreground gap-4 flex flex-col">
        <div className="flex gap-6 items-start">
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

        <div className="flex gap-6">
          <CustomerAvatar userId={booking.user?.id ?? ""} />
          <div className="flex flex-col text-sm">
            <div className="text-foreground">{booking.user?.name}</div>
            <p className="text-gray-500">{booking.user?.email}</p>
          </div>
        </div>

        <div className="flex gap-6">
          <div className="w-8 h-8 flex items-center justify-center">
            <RockingChair />
          </div>
          <div className="flex flex-wrap gap-2">
            {booking.seats.map((seat: Doc<"seats">) => (
              <SeatBadge key={seat._id}>{seat.seatNumber}</SeatBadge>
            ))}
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
