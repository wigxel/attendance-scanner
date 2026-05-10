"use client";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import type { Seat } from "@/hooks/useSeats";
import { safeObj } from "@/lib/data.helpers";
import { useQuery } from "convex/react";
import { LucideLoader } from "lucide-react";
import { SLSeatItem, SLTableItem } from "./SeatStructureGrid";
import type { SLEntry } from "./seat-grid-utils";

interface DynamicSeatLayoutProps {
  seats: Seat[];
  selectedSeatNumbers: string[];
  onSeatClick: (seat: Seat) => void;
}

export function DynamicSeatLayout({
  seats,
  selectedSeatNumbers,
  onSeatClick,
}: DynamicSeatLayoutProps) {
  const seatLayout = useQuery(api.seats.getSeatLayout);

  console.info(selectedSeatNumbers);

  if (seatLayout === undefined) {
    return (
      <div className="h-96 bg-gray-100 rounded-lg flex justify-center items-center">
        <div className="bg-white rounded-full p-4">
          <LucideLoader
            size={"2rem"}
            strokeWidth={1}
            className="animate-spin"
          />
        </div>
      </div>
    );
  }

  if (!seatLayout) {
    return (
      <div className="h-96 bg-gray-100 rounded-lg flex justify-center items-center">
        <p className="text-gray-600">No seat layout configured</p>
      </div>
    );
  }

  const {
    seats: layoutSeats,
    rowCount,
    columnCount,
  } = seatLayout as {
    seats: SLEntry[];
    rowCount: number;
    columnCount: number;
  };

  const gridStyle = {
    gridTemplateColumns: `repeat(${columnCount}, minmax(0, 1fr))`,
    gridTemplateRows: `repeat(${rowCount}, minmax(0, 1fr))`,
  };

  // Create map of seatNumber to seat data
  const seatDataMap = seats.reduce(
    (map, seat) => {
      map[seat.seatNumber] = seat;
      return map;
    },
    {} as Record<number, Seat>,
  );

  console.log({ seatLayout, seatDataMap });

  return (
    <div className="flex flex-col items-center justify-center">
      <div className="mb-3 flex justify-center gap-4 text-xs">
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 bg-white border rounded" />
          <span className="text-gray-600">Available</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 bg-[#FFF2CC80] border-[#FF9900] border rounded" />
          <span className="text-gray-600">Selected</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 bg-[#9A9A9A] bg-[url('/images/reserved-bg.png')] bg-contain rounded" />
          <span className="text-gray-600">Occupied</span>
        </div>
      </div>

      <div className="grid gap-1 text-[10px] w-full max-w-md" style={gridStyle}>
        {layoutSeats.map((layoutSeat: SLEntry) => {
          const style = {
            gridColumnStart: `${layoutSeat.position.colIndex + 1}`,
            gridRowStart: `${layoutSeat.position.rowIndex + 1}`,
          };

          if (layoutSeat.type === "table") {
            return (
              <SLTableItem
                key={layoutSeat.index}
                value={safeObj(layoutSeat.attributes)}
                style={style}
                mode="preview"
              />
            );
          }

          const seatData = seatDataMap[layoutSeat.seatNumber];
          if (!seatData) return null;

          return (
            <SLSeatItem
              key={layoutSeat.index}
              count={String(layoutSeat.seatNumber)}
              isBooked={false}
              isSelected={selectedSeatNumbers.includes(
                String(layoutSeat.seatNumber),
              )}
              onClick={() => {
                if (!seatData.isBooked) {
                  onSeatClick(seatData);
                }
              }}
              style={style}
            />
          );
        })}
      </div>
    </div>
  );
}
