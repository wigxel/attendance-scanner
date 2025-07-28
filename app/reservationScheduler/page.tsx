"use client";
import React, { useEffect, useState } from "react";
import type { DateRange } from "react-day-picker";
import "react-day-picker/dist/style.css";
import { useConvexAuth, useMutation, useQuery } from "convex/react";
import { useRouter } from "next/navigation";
import SchedulerComponent from "@/components/scheduler";
import SeatReservationComponent from "@/components/seatReservation";
import ReservationSummaryComponent from "@/components/reservationSummary";
import PaymentOptionComponent from "@/components/paymentOption";
import SeatReservationSuccessComponent from "@/components/seatReservationSuccess";
import ReservationTicketComponent from "@/components/reservationTicket";
import type { SeatObject } from "@/components/seat";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import ToastComponentProps from "@/components/toast";
import type { SeatStatus } from "@/convex/seatReservation";

interface MappedTable {
  selectedTable: string;
  seatReserved: SeatObject[];
}

export default function ReservationScheduler() {
  const router = useRouter();
  const { isAuthenticated } = useConvexAuth();

  const [selectedDate, setSelectedDate] = useState<DateRange | undefined>(
    undefined,
  );
  const [duration, setDuration] = useState(""); // custom time state
  const [numberOfSeats, setNumberOfSeats] = useState<number>(1);
  const [step, setStep] = useState<string>("scheduler"); // step in the reservation process
  const [table, setTable] = useState<string[]>([]); //table selection
  const [seat, setSeat] = useState<SeatObject[]>([]); //seat selection
  const [userId, setUserId] = useState<Id<"users"> | null>(null);
  const [reservedSeatsFromDb, setReservedSeatsFromDb] = useState<
    { seatReservationStatus: string; allocation: string }[] | undefined
  >(undefined);

  const startDate = selectedDate?.from?.toISOString() || undefined;
  const endDate = selectedDate?.to?.toISOString() || undefined;

  //Queries
  const user = useQuery(api.users.getAllUsers); //fetch all user for testing as we have just one user in the db. However it should fetch the details of the Authenticated user.
  const reservationData = useQuery(api.seatReservation.getAllSeatReservations); // fetch all the seat reservation by date

  //Mutations
  const createReservation = useMutation(api.reservation.createReservation); //insert reservation mutation
  const createSeatReservation = useMutation(
    api.seatReservation.createSeatReservation,
  ); //insert seat reservation mutation

  const seatToTable = (seatOption: string) => {
    // Exact match for Hub manager
    if (seatOption === "Hub Manager") return "Hub Manager";

    // Match 't1s1' → 'T1', 't2s3' → 'T2', etc.
    const match = seatOption.match(/^t(\d+)/i);
    return match ? `T${match[1]}` : null;
  };

  /* -------------------------------------------------
    rebuild table into to take the shape T1 - S1, T3 - S1, S2, S3, T4 - S2
    ------------------------------------------------- */

  const mappedTable: MappedTable[] = table.reduce<MappedTable[]>(
    (acc: MappedTable[], selectedTable: string) => {
      // all seats that belong to this table
      const reserved: SeatObject[] = seat.filter(
        (s: SeatObject) => seatToTable(s.seatAllocation) === selectedTable,
      );

      if (reserved.length) {
        acc.push({ selectedTable, seatReserved: reserved });
      }
      return acc;
    },
    [],
  );

  useEffect(() => {
    if (user && user.length > 0) {
      setUserId(user[0]._id as Id<"users">);
    } else {
      setUserId(null);
    }
  }, [user, userId]);

  useEffect(() => {
    // No valid date input
    if (!reservationData || !startDate) {
      setReservedSeatsFromDb(undefined);
      return;
    }

    const isRange = !!endDate && endDate !== startDate;

    const reservedSeatsByDate = reservationData
      .filter((item) => {
        const itemDate = item.date;

        if (!itemDate) return false;

        if (isRange) {
          // Range check
          return itemDate >= startDate && itemDate <= endDate;
        }

        // Exact date match
        return itemDate === startDate;
      })
      .flatMap((item) =>
        item.table.flatMap((tableItem) =>
          tableItem.seatReserved.map((seatItem) => ({
            seatReservationStatus: seatItem.seatStatus,
            allocation: seatItem.seatAllocation,
          })),
        ),
      );

    setReservedSeatsFromDb(
      reservedSeatsByDate.length > 0 ? reservedSeatsByDate : undefined,
    );
  }, [reservationData, startDate, endDate]);

  const formatSelectedDate = (date: DateRange | undefined) => {
    if (!date || !date.from) return "";

    return `${date.from.toISOString()}${date.to ? " - " + date.to.toISOString() : ""}`;
  };

  //save reserved seats to database
  const handleCreateSeatReservation = async () => {
    console.log("Creating seat reservation with:", {
      mappedTable,
      selectedDate,
    });
    //validate inputs
    if (!mappedTable || mappedTable.length === 0) {
      ToastComponentProps({
        type: "error",
        message: "Please select a table and seats",
      });
      return false;
    }
    if (!selectedDate || !selectedDate.from) {
      ToastComponentProps({ type: "error", message: "Please select a date." });
      return false;
    }

    try {
      const response = await createSeatReservation({
        mappedTable: mappedTable.map(({ selectedTable, seatReserved }) => ({
          selectedTable,
          seatReserved: seatReserved.map((seat) => ({
            label: seat.label,
            seatAllocation: seat.seatAllocation,
            seatStatus: seat.seatStatus as SeatStatus,
          })),
        })),
        selectedDate: formatSelectedDate(selectedDate),
      });

      if (response) {
        console.log(`Reservation created successfully ${response}`);
        return response;
      } else {
        console.log(
          "Seat reservation failed. No response was received. Problem with createSeatReservation",
        );
      }
      // reset form (optional)
    } catch (err) {
      console.error(err);
      return ToastComponentProps({
        type: "error",
        message: "Failed to create seat reservation",
      });
    }
  };

  const handleCreateReservation = async () => {
    const seatReservationsId = await handleCreateSeatReservation();

    //validate inputs
    if (!seatReservationsId) {
      ToastComponentProps({
        type: "error",
        message: "Unable to create seat reservation.",
      });
      return false;
    }
    if (!userId) {
      ToastComponentProps({ type: "error", message: "User not found" });
      return false;
    }
    if (!selectedDate || !selectedDate.from) {
      ToastComponentProps({ type: "error", message: "Please select a date." });
      return false;
    }
    if (numberOfSeats === 0) {
      ToastComponentProps({
        type: "error",
        message: "Please specify number of seats.",
      });
      return false;
    }
    if (duration === "") {
      ToastComponentProps({
        type: "error",
        message: "Please specify the duration of your stay.",
      });
      return false;
    }

    try {
      console.log("Creating reservation with:", {
        userId,
        selectedDate,
        duration,
        numberOfSeats,
        seatReservationsId,
      });
      const response = await createReservation({
        userId,
        selectedDate: formatSelectedDate(selectedDate),
        duration,
        numberOfSeats,
        seatReservationsId, // this should be the id of the seat reservation created
        status: "pending",
      });

      if (response) {
        console.log(`Reservation created successfully ${response}`);
        return response;
      } else {
        console.log(
          "Reservation creation failed. No response returned, problem with createReservation",
        );
      }

      // reset form (optional)
    } catch (err) {
      console.error(err);
      ToastComponentProps({
        type: "error",
        message: "Failed to create reservation",
      });
      return false;
    }
  };

  return (
    <section className="w-full h-screen flex justify-center items-center p-4 xl:p-0 relative">
      <div className="w-full sm:w-[335px] h-[812px] flex flex-col justify-start items-center">
        <form className="">
          {
            // rendering the scheduler component if the step is 'scheduler'
            step === "scheduler" && (
              <SchedulerComponent
                setStep={setStep} //sets the component to render
                selectedDate={selectedDate}
                numberOfSeats={numberOfSeats}
                setSelectedDate={setSelectedDate}
                duration={duration}
                setDuration={setDuration}
                setNumberOfSeats={setNumberOfSeats}
              />
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
        </form>

        {step === "reservationSummary" && (
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
        )}
      </div>
    </section>
  );
}
