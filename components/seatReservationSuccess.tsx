import { Check } from "lucide-react";
import React, { Dispatch, SetStateAction } from "react";
import ReservationTicketComponent from "./reservationTicket";

interface SeatReservationSuccessComponentProps {
  setStep: Dispatch<SetStateAction<string>>;
}

export default function SeatReservationSuccessComponent({
  setStep,
}: SeatReservationSuccessComponentProps) {
  const handleSubmit = () => {
    setStep("e-ticket");
  };

  return (
    <div className="w-full sm:w-[335px] h-[812px] flex flex-col justify-center items-center">
      {/* header text */}
      <div className="w-[335px] sm:max-w-[335px] h-[373px] sm:max-h-[373px] flex flex-col justify-center items-center bg-(--background-gray) rounded-lg">
        <div className="w-[118px] sm:max-w-[118px] h-[118px] sm:max-h-[118px] flex justify-center items-center rounded-full bg-(--button-gray)">
          <span>
            <Check className="w-18 h-18" />
          </span>
        </div>

        <p className="w-[258px] h-14 text-center text-2xl font-semibold mt-6">
          You have successfully reserved your seat
        </p>
      </div>

      <button
        type="button"
        className="w-full h-8 text-xs font-semibold bg-(--button-gray) text-black hover:bg-gray-300 rounded-sm mt-[140px]"
        onClick={() => handleSubmit()}
      >
        View e-Ticket
      </button>
    </div>
  );
}
