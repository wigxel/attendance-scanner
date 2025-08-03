import type { SeatObject } from "@/components/seat";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import type { SeatStatus } from "@/convex/seatReservation";
import { useQuery, useMutation } from "@tanstack/react-query";
import { duration } from "effect/Config";
import { observable } from "mobx";
import React from "react";
import { useEffect } from "react";
import type { DateRange } from "react-day-picker";
import type { FieldValues, UseFormReturn } from "react-hook-form";
import { toast } from "sonner";

interface MappedTable {
  selectedTable: string;
  seatReserved: SeatObject[];
}

type ReservationState = {
  selectedDate?: DateRange;
  duration: string;
  numberOfSeats: number;
  step: string;
  table: string[];
  seat: SeatObject[];
  userId: Id<"users"> | null;
  reservedSeatsFromDb?: { seatReservationStatus: string; allocation: string }[];
};

export const reservationState = observable<ReservationState>({
  selectedDate: undefined as DateRange | undefined,
  duration: "",
  numberOfSeats: 1,
  step: "scheduler",
  table: [] as string[],
  seat: [] as SeatObject[],
  userId: null as Id<"users"> | null,
  reservedSeatsFromDb: undefined as
    | { seatReservationStatus: string; allocation: string }[]
    | undefined,
});

export function useSomething() {
  const startDate =
    reservationState.selectedDate?.from?.toISOString() || undefined;
  const endDate = reservationState.selectedDate?.to?.toISOString() || undefined;

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
  const mappedTable: MappedTable[] = reservationState.table.reduce<
    MappedTable[]
  >((acc: MappedTable[], selectedTable: string) => {
    // all seats that belong to this table
    const reserved: SeatObject[] = reservationState.seat.filter(
      (s: SeatObject) => seatToTable(s.seatAllocation) === selectedTable,
    );

    if (reserved.length) {
      acc.push({ selectedTable, seatReserved: reserved });
    }
    return acc;
  }, []);

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

  return {
    formatSelectedDate,
    handleCreateSeatReservation,
    handleCreateReservation,
  };
}

export function useFormErrorToast<A extends FieldValues, B, C>(form: UseFormReturn<A, B, C>) {
  React.useEffect(() => {
    const all_errors = form.formState.errors;

    for (const errorKey in all_errors) {
      const error = all_errors[errorKey];

      //  @ts-expect-error No really necessary
      if (!("message" in error)) return;

      //  @ts-expect-error No really necessary
      toast.error(error.message ?? "Something unexpected happened")
    }
  }, [form.formState.errors]);
}
