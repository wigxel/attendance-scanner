"use client";

import React, { useEffect, useState } from "react";
import Barcode from "react-barcode";
import { DateRange } from "react-day-picker";
import { SeatObject } from "./seat";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";

type ReservationTicketComponentProps = {
  selectedDate: DateRange | undefined;
  duration: string;
  numberOfSeats: number;
  table: string[];
  seat: SeatObject[];
};
export default function ReservationTicketComponent({
  selectedDate,
  duration,
  numberOfSeats,
  table,
  seat,
}: ReservationTicketComponentProps) {
  const [userId, setUserId] = useState<Id<"users"> | null>(null);
  const [reservationId, setReservationId] = useState<string>("");
  const [seatReservationID, setSeatRservationID] =
    useState<Id<"seatReservations"> | null>(null);
  //fetch user data from database.Ideally this should be the authenticated user
  const user = useQuery(api.users.getAllUsers);
  //Fetch latest reservations data from the database for the loggedIn user
  const latestReservation = useQuery(
    api.reservation.getLatestReservation,
    userId !== null ? { userId } : "skip",
  );
  //Fetch latest seat reservations data from the database for the loggedIn user
  const latestSeatReservation = useQuery(
    api.seatReservation.getSeatReservation,
    seatReservationID !== null ? { seatReservationID } : "skip",
  );

  function formatDate(input: string) {
    const options = { dateStyle: "short", timeZone: "Africa/Lagos" } as object;

    // Check if input is a range (contains " - ")
    if (input.includes(" - ")) {
      const [startDateStr, endDateStr] = input
        .split(" - ")
        .map((str) => str.trim());

      // Parse and validate both dates
      const startDate = new Date(startDateStr);
      const endDate = new Date(endDateStr);

      if (!isNaN(startDate.getTime()) && !isNaN(endDate.getTime())) {
        return `${startDate.toLocaleString("en-US", options)} - ${endDate.toLocaleString("en-US", options)}`;
      } else {
        return "Invalid date range";
      }
    } else {
      // Single date
      const date = new Date(input);
      return date && !isNaN(date.getTime())
        ? date.toLocaleString("en-US", options)
        : "Invalid date";
    }
  }

  const data = [
    { id: 1, field: "Name", val: "Sim Fubara" },
    { id: 2, field: "Phone", val: "08041941941" },
    { id: 3, field: "Email", val: "simfubara@gmail.com" },
    {
      id: 4,
      field: "Reservation ID",
      val: `${latestSeatReservation && latestSeatReservation?._id}`,
    },
    { id: 5, field: "Duration", val: duration },
    {
      id: 6,
      field: "Table No.",
      val:
        latestSeatReservation &&
        latestSeatReservation?.table
          .map((item) => {
            const seatNames = item.seatReserved.map((s) => s.label).join(", ");
            return `${item.selectedTable} - ${seatNames}`;
          })
          .join("; "), // separate multiple tables with semicolon
    },
    { id: 7, field: "No. of Seats", val: numberOfSeats },
    { id: 8, field: "Reservation Date", val: selectedDate },
    { id: 9, field: "Payment Status", val: "Not Paid" },
    { id: 10, field: "Amount", val: "N3000.00" },
  ];

  useEffect(() => {
    // set userId and seatReservationID when user and latestReservation are available
    const shortId = latestReservation && latestReservation?._id.slice(0, 25); // UI only
    return (
      setUserId(user && user[0]?._id ? (user[0]._id as Id<"users">) : null),
      setReservationId(shortId || ""),
      setSeatRservationID(
        latestReservation && latestReservation?.seatReservationsId
          ? (latestReservation?.seatReservationsId as Id<"seatReservations">)
          : null,
      )
    );
  }, [user, userId, latestReservation, seat]);

  return (
    <section className="w-full h-screen flex flex-col justify-center">
      <div className="relative w-[335px] max-w-[335px] h-[445px] mx-auto bg-(--background-gray) rounded-md overflow-hidden">
        {/* Left side circle */}
        <div className="absolute w-[31px] h-[30px] bg-(--background) rounded-full left-[-13px] top-[135px] transform -translate-y-1/2"></div>

        {/* Right side circle */}
        <div className="absolute w-[31px] h-[30px] bg-(--background) rounded-full right-[-13px] top-[135px] transform -translate-y-1/2"></div>

        {/* Top content */}
        <div className="w-full h-[135px] flex flex-col items-center justify-center px-4 py-8 border-b-3 border-dashed ">
          <div className="w-full flex justify-between items-center mb-2">
            <h1 className="text-xs font-medium text-(--text-gray)">Name</h1>
            <span className="text-xs font-semibold">
              {user && user[0]?.name ? user[0].name : ""}
            </span>
          </div>
          <div className="w-full flex justify-between items-center mb-2">
            <h1 className="text-xs font-medium text-(--text-gray)">Phone</h1>
            <span className="text-xs font-semibold">
              {user && user[0]?.phone ? user[0].phone : ""}
            </span>
          </div>
          <div className="w-full flex justify-between items-center mb-2">
            <h1 className="text-xs font-medium text-(--text-gray)">Email</h1>
            <span className="text-xs font-semibold">
              {user && user[0]?.email ? user[0].email : ""}
            </span>
          </div>
        </div>

        {/* Bottom content */}
        <div className="w-full h-[310px] flex flex-col items-center justify-start text-center px-4 py-8">
          <div className="w-full flex justify-between items-center mb-2">
            <h1 className="text-xs font-medium text-(--text-gray)">
              Reservation ID
            </h1>
            <span className="text-xs font-semibold">{reservationId}</span>
          </div>
          <div className="w-full flex justify-between items-center mb-2">
            <h1 className="text-xs font-medium text-(--text-gray)">Duration</h1>
            <span className="text-xs font-semibold">
              {latestReservation?.duration ?? ""}
            </span>
          </div>
          <div className="w-full flex justify-between items-center mb-2">
            <h1 className="text-xs font-medium text-(--text-gray)">
              Table No.
            </h1>
            <span className="text-xs font-semibold">
              {
                latestSeatReservation &&
                  latestSeatReservation?.table
                    .map((item) => {
                      const seatNames = item.seatReserved
                        .map((s) => s.label)
                        .join(", ");
                      return `${item.selectedTable} - ${seatNames}`;
                    })
                    .join("; ") // separate multiple tables with semicolon
              }
            </span>
          </div>
          <div className="w-full flex justify-between items-center mb-2">
            <h1 className="text-xs font-medium text-(--text-gray)">
              No. of Seats
            </h1>
            <span className="text-xs font-semibold">
              {latestReservation?.numberOfSeats ?? ""}
            </span>
          </div>
          <div className="w-full flex justify-between items-center mb-2">
            <h1 className="text-xs font-medium text-(--text-gray)">
              Reservation Date
            </h1>
            <span className="text-xs font-semibold">
              {formatDate(latestReservation?.date || "N/A")}
            </span>
          </div>
          <div className="w-full flex justify-between items-center mb-2">
            <h1 className="text-xs font-medium text-(--text-gray)">
              Payment Status
            </h1>
            <span className="text-xs font-semibold">Paid</span>
          </div>
          <div className="w-full flex justify-between items-center mb-2">
            <h1 className="text-xs font-medium text-(--text-gray)">Amount</h1>
            <span className="text-xs font-semibold">N3000.00</span>
          </div>
          <footer className="w-full h-fit flex justify-center items-center">
            <div className="w-[206px] max-w-[206px] h-[67px] max-h-[67px]">
              <Barcode
                value={data[3]?.val?.toString() ?? ""} // Use Reservation ID as barcode value
                width={1}
                height={50}
                format="CODE128"
                displayValue={false}
                background="transparent"
                marginTop={20}
                marginLeft={10}
              />
            </div>
          </footer>
        </div>

        {/* Bottom dots */}
        <div className="absolute bottom-[-3px] left-[2px] flex space-x-[9px] px-3">
          {[...Array(26)].map((_, i) => (
            <div
              key={i}
              className="w-[11px] h-[12px] bg-(--background) rounded-full"
            ></div>
          ))}
        </div>
      </div>

      <a
        href="/welcomeOptions"
        className="w-full h-8 flex justify-center items-center text-xs font-semibold bg-(--button-gray) text-black hover:bg-gray-300 rounded-sm mt-[120px]"
      >
        Return to Homepage
      </a>
    </section>
  );
}
