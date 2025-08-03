"use client";
import React, { } from "react";
import "react-day-picker/dist/style.css";
// import { useConvexAuth } from "convex/react";
// import { useRouter } from "next/navigation";
// import SeatReservationComponent from "@/components/seatReservation";
// import ReservationSummaryComponent from "@/components/reservationSummary";
// import PaymentOptionComponent from "@/components/paymentOption";
// import SeatReservationSuccessComponent from "@/components/seatReservationSuccess";
// import ReservationTicketComponent from "@/components/reservationTicket";
// import { useSomething } from './shared';
import { Page1 } from "./page-1/page";

export default function ReservationScheduler() {
  // const router = useRouter();
  // const { isAuthenticated } = useConvexAuth();
  // const { } = useSomething();

  return (
    <section className="w-full h-screen flex justify-center items-center p-4 xl:p-0 relative">
      <div className="w-full sm:w-[335px] h-[812px] flex flex-col justify-start items-center">
        <Page1 />
        {/*<form className="">
          {
            // rendering the scheduler component if the step is 'scheduler'
            step === "scheduler" && (
            )
          }

          {
            // rendering the seat reservation component if the step is 'seat_reservation'
            step === "seatReservation" && (
              <SeatReservationComponent
                setStep={setStep} //sets the component to render
                table={table}
                setTable={setTable}
                seat={seat}
                setSeat={setSeat}
                numberOfSeats={numberOfSeats}
                cfg={{
                  id: "",
                  wrapper: "",
                  container: "",
                  table: {
                    size: "",
                    position: "",
                    tableRotation: "",
                    textRotation: "",
                  },
                  seats: [],
                }}
                TABLE_LAYOUT={[]}
                reservedSeatsFromDb={reservedSeatsFromDb ?? undefined}
              />
            )
          }
        </form>*/}

        {/*{step === "reservationSummary" && (
          <ReservationSummaryComponent
            setStep={setStep}
            selectedDate={selectedDate}
            duration={duration}
            numberOfSeats={numberOfSeats}
            table={table}
            seat={seat}
          />
        )}

        {step === "paymentOptions" && (
          <PaymentOptionComponent
            setStep={setStep} //sets the component to render
            handleCreateReservation={handleCreateReservation}
          />
        )}

        {step === "reservationSuccess" && (
          <SeatReservationSuccessComponent
            setStep={setStep} //sets the component to render
          />
        )}

        {step === "e-ticket" && (
          <ReservationTicketComponent
            selectedDate={selectedDate}
            duration={duration}
            numberOfSeats={numberOfSeats}
            table={table}
            seat={seat}
          />
        )}*/}
      </div>
    </section>
  );
}
