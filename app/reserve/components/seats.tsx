import { useSeats } from "@/hooks/useSeats";
import type React from "react";

export function SelectedSeats(props: {
  proceedButton?: React.ReactNode;
}) {
  const { selectedSeatNumbers } = useSeats();

  return (
    <div className="border-gray-200 flex flex-col bg-white border p-4 rounded-lg">
      <div>
        <p className="text-gray-900 text-sm">Selected Seats:</p>

        <div className="text-sm text-gray-600 mt-1">
          <p className="font-semibold inline-flex text-gray-900 gap-2">
            {selectedSeatNumbers.map((seat_num) => {
              return (
                <span
                  key={seat_num}
                  className="size-8 rounded-sm border aspect-square flex items-center justify-center font-mono"
                >
                  #{seat_num}
                </span>
              );
            })}
          </p>
        </div>
      </div>

      <div className="flex border-t mt-4 pt-4 justify-between">
        <p className="text-sm mt-1 text-gray-500">
          {selectedSeatNumbers.length} seat
          {selectedSeatNumbers.length !== 1 ? "s" : ""} selected
        </p>

        {props.proceedButton}
      </div>
    </div>
  );
}
