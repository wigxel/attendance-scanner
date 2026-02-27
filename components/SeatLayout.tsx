import { useBookingStore } from "@/app/reserve/store";
import type { Id } from "@/convex/_generated/dataModel";
import type React from "react";

import { cn } from "@/lib/utils";
import Chair from "@/public/images/chair.png";
import { motion } from "motion/react";
import Image from "next/image";

interface SeatData {
  _id: Id<"seats">;
  seatNumber: string | number;
  isBooked: boolean;
}

interface SeatProps {
  index: string;
  seatData: SeatData;
  isSelected: boolean;
  onClick: (seat: SeatData) => void;
  className?: string;
}

interface SeatLayoutProps {
  seats: SeatData[];
  selectedSeatNumbers: (string | number)[];
  onSeatClick: (seat: SeatData) => void;
}

// Seat Component
const Seat: React.FC<SeatProps> = ({
  index,
  seatData,
  isSelected,
  onClick,
  className = "",
}) => {
  const handleClick = (): void => {
    if (!seatData.isBooked) {
      onClick(seatData);
    }
  };

  const getSeatStyles = (): string => {
    const baseStyles =
      "rounded-lg p-1 cursor-pointer transition-all duration-200 flex items-center justify-center text-xs font-medium";

    if (seatData.isBooked) {
      return `${baseStyles} text-gray-800 cursor-not-allowed`;
    }

    if (isSelected) {
      return `${baseStyles} bg-[#FFF2CC80] border-[#FF9900] border text-[#FF9900] shadow-lg scale-105`;
    }

    return `${baseStyles} border border-transparent bg-white text-gray-800 hover:bg-gray-300`;
  };

  return (
    <button
      type="button"
      title={`Seat ${seatData.seatNumber} - ${seatData.isBooked ? "Reserved" : isSelected ? "Selected" : "Available"}`}
      className={cn(getSeatStyles(), className, "relative")}
      onClick={handleClick}
    >
      {!seatData.isBooked ? (
        <motion.span
          animate={
            !isSelected
              ? { translateY: 0, translateX: 0, opacity: 0, scale: 0.25 }
              : { scale: 1, opacity: 1, translateY: "-50%", translateX: "-50%" }
          }
          className="absolute top-0 left-0 bg-white bg-white p-2 rounded-full size-8"
        >
          {" "}
          {index}{" "}
        </motion.span>
      ) : (
        <span
          className="pointer-events-none absolute inset-0 bg-[url('/images/reserved-bg.png')] rounded-lg"
          style={{ backgroundSize: "60px" }}
        />
      )}

      <Image src={Chair} alt="Chair" width={32} height={32} />
    </button>
  );
};

// Table Component
const Table: React.FC<{
  className?: string;
  shape?: "rectangle" | "circle";
}> = ({ className = "", shape = "rectangle" }) => {
  const shapeClass = shape === "circle" ? "rounded-full" : "rounded-md";
  return (
    <div className={`bg-white shadow-2xs p-3.5 ${shapeClass} ${className}`} />
  );
};

const SeatLayout: React.FC<SeatLayoutProps> = ({ seats, onSeatClick }) => {
  const { selectedSeatNumbers } = useBookingStore();

  // map for quick seat lookup
  const seatMap: Record<string, SeatData> = seats.reduce(
    (map, seat) => {
      map[seat.seatNumber] = seat;
      return map;
    },
    {} as Record<string, SeatData>,
  );

  const getSeat = (seatNumber: string): SeatData | null => {
    return seatMap[seatNumber] || null;
  };

  const isSeatSelected = (seatNumber: string | number): boolean => {
    return selectedSeatNumbers.some(
      (selectedSeat) => Number(selectedSeat) === Number(seatNumber),
    );
  };

  return (
    <div className="flex flex-col items-center justify-center">
      <div className="my-6">
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
      </div>

      <div className="grid grid-cols-9 grid-rows-15 gap-1 text-[10px] w-full max-w-md">
        {/* Table 1 */}
        {getSeat("1") && (
          <Seat
            index="1"
            seatData={getSeat("1")!}
            isSelected={isSeatSelected(1)}
            onClick={onSeatClick}
            className="col-start-2"
          />
        )}
        {getSeat("2") && (
          <Seat
            index="2"
            seatData={getSeat("2")!}
            isSelected={isSeatSelected(2)}
            onClick={onSeatClick}
          />
        )}
        <Table className="col-span-2 col-start-2" />

        {/* Table 2 */}
        <Table className="col-start-8 row-span-2" />
        {getSeat("3") && (
          <Seat
            index="3"
            seatData={getSeat("3")!}
            isSelected={isSeatSelected(3)}
            onClick={onSeatClick}
            className="col-start-9"
          />
        )}
        {getSeat("4") && (
          <Seat
            index="4"
            seatData={getSeat("4")!}
            isSelected={isSeatSelected(4)}
            onClick={onSeatClick}
            className="col-start-9"
          />
        )}

        {/* Table 3 */}
        {getSeat("5") && (
          <Seat
            index="5"
            seatData={getSeat("5")!}
            isSelected={isSeatSelected(5)}
            onClick={onSeatClick}
            className="col-start-3 row-start-5"
          />
        )}
        {getSeat("6") && (
          <Seat
            index="6"
            seatData={getSeat("6")!}
            isSelected={isSeatSelected(6)}
            onClick={onSeatClick}
            className="col-start-4 row-start-5"
          />
        )}
        <Table className="col-start-2 col-span-4 row-span-2" shape="circle" />

        {getSeat("7") && (
          <Seat
            index="7"
            seatData={getSeat("7")!}
            isSelected={isSeatSelected(7)}
            onClick={onSeatClick}
            className="col-start-1 -translate-y-5"
          />
        )}
        {getSeat("8") && (
          <Seat
            index="8"
            seatData={getSeat("8")!}
            isSelected={isSeatSelected(8)}
            onClick={onSeatClick}
            className="col-start-6 -translate-y-5"
          />
        )}
        {getSeat("9") && (
          <Seat
            index="9"
            seatData={getSeat("9")!}
            isSelected={isSeatSelected(9)}
            onClick={onSeatClick}
            className="col-start-3"
          />
        )}
        {getSeat("10") && (
          <Seat
            index="10"
            seatData={getSeat("10")!}
            isSelected={isSeatSelected(10)}
            onClick={onSeatClick}
            className="col-start-4"
          />
        )}

        {/* Table 4 */}
        {getSeat("11") && (
          <Seat
            index="11"
            seatData={getSeat("11")!}
            isSelected={isSeatSelected(11)}
            onClick={onSeatClick}
            className="col-start-3 row-start-10"
          />
        )}
        {getSeat("12") && (
          <Seat
            index="12"
            seatData={getSeat("12")!}
            isSelected={isSeatSelected(12)}
            onClick={onSeatClick}
            className="col-start-4 row-start-10"
          />
        )}
        <Table className="col-start-2 col-span-4 row-span-2" />

        {getSeat("13") && (
          <Seat
            index="13"
            seatData={getSeat("13")!}
            isSelected={isSeatSelected(13)}
            onClick={onSeatClick}
            className="col-start-3"
          />
        )}
        {getSeat("14") && (
          <Seat
            index="14"
            seatData={getSeat("14")!}
            isSelected={isSeatSelected(14)}
            onClick={onSeatClick}
            className="col-start-4"
          />
        )}

        {/* Table 5 */}
        <Table className="col-start-8 row-span-2 row-start-11" />
        {getSeat("15") && (
          <Seat
            index="15"
            seatData={getSeat("15")!}
            isSelected={isSeatSelected(15)}
            onClick={onSeatClick}
            className="col-start-9 row-start-11"
          />
        )}
        {getSeat("16") && (
          <Seat
            index="16"
            seatData={getSeat("16")!}
            isSelected={isSeatSelected(16)}
            onClick={onSeatClick}
            className="col-start-9 row-start-12"
          />
        )}
      </div>
    </div>
  );
};

export default SeatLayout;
