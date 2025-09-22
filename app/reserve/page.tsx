"use client";
import { useEffect, useState } from "react";
import { ConvexHttpClient } from "convex/browser";
// import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";

import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import BookingCalendar from "@/components/BookingCalendar";
import SeatLayout from "@/components/SeatLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface Seat {
  seatNumber: string;
  isOccupied: boolean;
}

const httpClient = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

function Content() {
  const [activeTab, setActiveTab] = useState("booking");
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedSeatId, setSelectedSeatId] = useState<string | null>(null);

  const handleTabChange = (value: string) => {
    setActiveTab(value);
  };
  const handleProceed = (date: Date) => {
    setActiveTab("choose");
    setSelectedDate(date);
  };

  return (
    <div className="bg-white flex flex-col scanline-root max-w-lg mx-auto p-6 pb-14 rounded-2xl">
      <Tabs
        value={activeTab}
        onValueChange={handleTabChange}
        defaultValue="booking"
        className="w-full"
      >
        <TabsList className="w-full">
          <TabsTrigger value="booking" className="cursor-pointer">
            Pick a Date
          </TabsTrigger>
          <TabsTrigger value="choose" className="cursor-pointer">
            Choose Seat
          </TabsTrigger>
          <TabsTrigger value="payment" className="cursor-pointer">
            Make Payment
          </TabsTrigger>
        </TabsList>
        <TabsContent value="booking">
          <PickScheduleTab onProceed={handleProceed} />
        </TabsContent>
        <TabsContent value="choose">
          <PickSeatTab
            selectedSeatId={selectedSeatId}
            setSelectedSeatId={setSelectedSeatId}
          />
        </TabsContent>
        <TabsContent value="payment">
          <MakePaymentTab selectedSeatId={selectedSeatId} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function PickScheduleTab({ onProceed }: { onProceed: (date: Date) => void }) {
  return (
    <div>
      <BookingCalendar onProceed={onProceed} />
    </div>
  );
}

function PickSeatTab({
  selectedSeatId,
  setSelectedSeatId,
}: {
  selectedSeatId: string | null;
  setSelectedSeatId: (id: string | null) => void;
}) {
  /*
  const seats = useQuery(api.seats.getAllSeats);
  console.log("Seats data:", seats);
  */

  const [seats, setSeats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSeats = async () => {
      try {
        const result = await httpClient.query(api.seats.getAllSeats, {});
        // @ts-expect-error test
        setSeats(result);
      } catch (error) {
        console.error("Error fetching seats:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchSeats();
  }, []);

  useEffect(() => {
    // Check if the selected seat has become occupied
    if (selectedSeatId && seats) {
      // @ts-expect-error test
      const selectedSeat = seats.find(
        (seat: Seat) => seat.seatNumber === selectedSeatId,
      );
      if (selectedSeat && selectedSeat.isOccupied) {
        setSelectedSeatId(null);
      }
    }
  }, [seats, selectedSeatId]);

  if (loading) {
    return <div>Loading seats...</div>;
  }

  if (!seats) {
    return <div>No seats available</div>;
  }

  const handleSeatSelect = (seat: Seat): void => {
    const newSeatId = seat.seatNumber;
    setSelectedSeatId(newSeatId);
  };

  /*
  if (seats === undefined) {
    return <div>Loading seats...</div>;
  }

  // @ts-expect-error test
  if (seats === null || seats.length === 0) {
    return <div>No seats available</div>;
  }
  */

  return (
    <div className="p-3 bg-gray-100 min-h-screen rounded-lg">
      <SeatLayout
        seats={seats}
        onSeatSelect={handleSeatSelect}
        selectedSeatId={selectedSeatId}
      />
    </div>
  );
}

function MakePaymentTab({ selectedSeatId }: { selectedSeatId: string | null }) {
  return (
    <div>
      <p>Make payment here.</p>
      {selectedSeatId && <p>Selected seat: {selectedSeatId}</p>}
    </div>
  );
}

export default function ReservePage() {
  return (
    <>
      <title>Reserve | InSpace</title>
      <div className="fixed inset-0 z-0 scanline-container pointer-events-none" />
      <div className="z-[2] relative">
        <Header />

        <main className="px-4">
          <Content />
        </main>

        <Footer />
      </div>
    </>
  );
}
