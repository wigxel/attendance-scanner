import type React from "react";
import { useSeats } from "@/hooks/useSeats";

type SelectedSeatsProps = { proceedButton?: React.ReactNode };

export function SelectedSeats(props: SelectedSeatsProps) {
  const { selectedSeatNumbers } = useSeats();

  return (
    <div className="border-border text-foreground flex flex-col bg-background border p-4 rounded-lg">
      <div>
        <p className="text-foreground text-sm">Selected Seats:</p>

        <div className="text-sm text-muted-foreground mt-1">
          <p className="font-semibold inline-flex text-gray-900 gap-2">
            {selectedSeatNumbers.map((seat_num) => {
              return <SeatBadge key={seat_num}>{seat_num}</SeatBadge>;
            })}
          </p>
        </div>
      </div>

      <div className="flex border-t mt-4 pt-4 justify-between">
        <p className="text-sm mt-1 text-muted-foreground">
          {selectedSeatNumbers.length} seat
          {selectedSeatNumbers.length !== 1 ? "s" : ""} selected
        </p>

        {props.proceedButton}
      </div>
    </div>
  );
}

type SeatBadgeProps = {
  children: React.ReactNode;
};

export function SeatBadge({ children }: SeatBadgeProps) {
  return (
    <span className="size-8 rounded-sm border-b-2 border border-foreground tabular-nums text-foreground aspect-square flex items-center justify-center text-sm font-mono">
      #{children}
    </span>
  );
}
