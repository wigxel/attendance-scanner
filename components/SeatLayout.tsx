import React from "react";
import { Id } from "@/convex/_generated/dataModel";
import {
  useBookingStore,
  setSelectedSeatId,
  setSelectedSeatNumber,
} from "@/app/reserve/store";

import Chair from "@/public/images/chair.png";
import Image from "next/image";

interface SeatData {
  _id: Id<"seats">;
  seatNumber: string | number;
  isBooked: boolean;
}

interface SeatProps {
  seatData: SeatData;
  isSelected: boolean;
  onClick: (seat: SeatData) => void;
  className?: string;
}

interface SeatLayoutProps {
  seats: SeatData[];
  onSeatSelect?: (seat: SeatData) => void;
}

// Seat Component
const Seat: React.FC<SeatProps> = ({
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
      return `${baseStyles} bg-[#9A9A9A] bg-[url('/images/reserved-bg.png')] bg-contain text-gray-800 cursor-not-allowed`;
    }

    if (isSelected) {
      return `${baseStyles} bg-[#FFF2CC80] border-[#FF9900] border text-[#FF9900] shadow-lg scale-105`;
    }

    return `${baseStyles} bg-white text-gray-800 hover:bg-gray-300`;
  };

  return (
    <div
      className={`${getSeatStyles()} ${className}`}
      onClick={handleClick}
      title={`Seat ${seatData.seatNumber} - ${seatData.isBooked ? "Reserved" : isSelected ? "Selected" : "Available"}`}
    >
      <Image src={Chair} alt="Chair" width={32} height={32} />
    </div>
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

const SeatLayout: React.FC<SeatLayoutProps> = ({ seats }) => {
  const { selectedSeatNumber } = useBookingStore();

  const handleSeatClick = (seat: SeatData): void => {
    setSelectedSeatNumber(seat.seatNumber);
    setSelectedSeatId(seat._id);
  };

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

  return (
    <div className="flex flex-col items-center justify-center">
      <div className="my-6">
        <div className="mb-3 flex justify-center gap-4 text-xs">
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-white border rounded"></div>
            <span className="text-gray-600">Available</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-[#FFF2CC80] border-[#FF9900] border rounded"></div>
            <span className="text-gray-600">Selected</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-[#9A9A9A] bg-[url('/images/reserved-bg.png')] bg-contain rounded"></div>
            <span className="text-gray-600">Occupied</span>
          </div>
        </div>

        <div className="text-gray-600 text-xs text-center">
          <p>Click proceed to select your seat</p>
        </div>
      </div>

      <div className="grid grid-cols-9 grid-rows-15 gap-1 text-[10px] w-full max-w-md">
        {/* Table 1 */}
        {getSeat("1") && (
          <Seat
            seatData={getSeat("1")!}
            isSelected={selectedSeatNumber == "1"}
            onClick={handleSeatClick}
            className="col-start-2"
          />
        )}
        {getSeat("2") && (
          <Seat
            seatData={getSeat("2")!}
            isSelected={selectedSeatNumber == "2"}
            onClick={handleSeatClick}
          />
        )}
        <Table className="col-span-2 col-start-2" />

        {/* Table 2 */}
        <Table className="col-start-8 row-span-2" />
        {getSeat("3") && (
          <Seat
            seatData={getSeat("3")!}
            isSelected={selectedSeatNumber == "3"}
            onClick={handleSeatClick}
            className="col-start-9"
          />
        )}
        {getSeat("4") && (
          <Seat
            seatData={getSeat("4")!}
            isSelected={selectedSeatNumber == "4"}
            onClick={handleSeatClick}
            className="col-start-9"
          />
        )}

        {/* Table 3 */}
        {getSeat("5") && (
          <Seat
            seatData={getSeat("5")!}
            isSelected={selectedSeatNumber == "5"}
            onClick={handleSeatClick}
            className="col-start-3 row-start-5"
          />
        )}
        {getSeat("6") && (
          <Seat
            seatData={getSeat("6")!}
            isSelected={selectedSeatNumber == "6"}
            onClick={handleSeatClick}
            className="col-start-4 row-start-5"
          />
        )}
        <Table className="col-start-2 col-span-4 row-span-2" shape="circle" />

        {getSeat("7") && (
          <Seat
            seatData={getSeat("7")!}
            isSelected={selectedSeatNumber == "7"}
            onClick={handleSeatClick}
            className="col-start-1 -translate-y-5"
          />
        )}
        {getSeat("8") && (
          <Seat
            seatData={getSeat("8")!}
            isSelected={selectedSeatNumber == "8"}
            onClick={handleSeatClick}
            className="col-start-6 -translate-y-5"
          />
        )}
        {getSeat("9") && (
          <Seat
            seatData={getSeat("9")!}
            isSelected={selectedSeatNumber == "9"}
            onClick={handleSeatClick}
            className="col-start-3"
          />
        )}
        {getSeat("10") && (
          <Seat
            seatData={getSeat("10")!}
            isSelected={selectedSeatNumber == "10"}
            onClick={handleSeatClick}
            className="col-start-4"
          />
        )}

        {/* Table 4 */}
        {getSeat("11") && (
          <Seat
            seatData={getSeat("11")!}
            isSelected={selectedSeatNumber == "11"}
            onClick={handleSeatClick}
            className="col-start-3 row-start-10"
          />
        )}
        {getSeat("12") && (
          <Seat
            seatData={getSeat("12")!}
            isSelected={selectedSeatNumber == "12"}
            onClick={handleSeatClick}
            className="col-start-4 row-start-10"
          />
        )}
        <Table className="col-start-2 col-span-4 row-span-2" />

        {getSeat("13") && (
          <Seat
            seatData={getSeat("13")!}
            isSelected={selectedSeatNumber == "13"}
            onClick={handleSeatClick}
            className="col-start-3"
          />
        )}
        {getSeat("14") && (
          <Seat
            seatData={getSeat("14")!}
            isSelected={selectedSeatNumber == "14"}
            onClick={handleSeatClick}
            className="col-start-4"
          />
        )}

        {/* Table 5 */}
        <Table className="col-start-8 row-span-2 row-start-11" />
        {getSeat("15") && (
          <Seat
            seatData={getSeat("15")!}
            isSelected={selectedSeatNumber == "15"}
            onClick={handleSeatClick}
            className="col-start-9 row-start-11"
          />
        )}
        {getSeat("16") && (
          <Seat
            seatData={getSeat("16")!}
            isSelected={selectedSeatNumber == "16"}
            onClick={handleSeatClick}
            className="col-start-9 row-start-12"
          />
        )}
      </div>
    </div>
  );
};

export default SeatLayout;
