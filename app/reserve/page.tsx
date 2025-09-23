"use client";
import { useEffect, useState } from "react";
import { useUser } from "@clerk/nextjs";
import { ConvexHttpClient } from "convex/browser";
// import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";

import { LucideLoader } from "lucide-react";
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
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [price, setPrice] = useState<number | null>(null);
  const [selectedSeatId, setSelectedSeatId] = useState<string | null>(null);

  useEffect(() => {
    const fetchCurrentUser = async () => {
      try {
        const currentUser = await httpClient.query(api.auth.getCurrentUser, {});
        console.log("Current user details:", currentUser);
      } catch (error) {
        console.error("Error fetching current user:", error);
      }
    };

    fetchCurrentUser();
  }, []);

  const handleTabChange = (value: string) => {
    setActiveTab(value);
  };
  const handleProceed = (date: Date, endDate: Date, price: number) => {
    setActiveTab("choose");
    setSelectedDate(date);
    setEndDate(endDate);
    setPrice(price);
  };
  const handleSeatProceed = () => {
    setActiveTab("payment");
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
            onProceed={handleSeatProceed}
          />
        </TabsContent>
        <TabsContent value="payment">
          <MakePaymentTab
            selectedSeatId={selectedSeatId}
            selectedDate={selectedDate}
            endDate={endDate}
            price={price}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function PickScheduleTab({
  onProceed,
}: {
  onProceed: (date: Date, endDate: Date, price: number) => void;
}) {
  return (
    <div>
      <BookingCalendar onProceed={onProceed} />
    </div>
  );
}

function PickSeatTab({
  selectedSeatId,
  setSelectedSeatId,
  onProceed,
}: {
  selectedSeatId: string | null;
  setSelectedSeatId: (id: string | null) => void;
  onProceed: () => void;
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
  }, [seats, selectedSeatId, setSelectedSeatId]);

  if (loading) {
    return (
      <div className="h-96 bg-gray-100 rounded-lg flex justify-center items-center">
        <div className="bg-white rounded-full p-4">
          <LucideLoader
            size={"2rem"}
            strokeWidth={1}
            className="animate animate-spin"
          />
        </div>
      </div>
    );
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
      {selectedSeatId && (
        <div className="bg-white p-4 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-gray-900">Selected Seat:</p>
              <div className="text-sm text-gray-600 mt-1">
                <p>Seat {selectedSeatId}</p>
              </div>
            </div>
            <button
              onClick={onProceed}
              className="px-6 py-2 bg-[#0000FF] text-white rounded-lg font-medium hover:bg-blue-600 transition-colors cursor-pointer"
            >
              Proceed
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function MakePaymentTab({
  selectedSeatId,
  selectedDate,
  endDate,
  price,
}: {
  selectedSeatId: string | null;
  selectedDate: Date | null;
  endDate: Date | null;
  price: number | null;
}) {
  const { user } = useUser();
  const formatPrice = (price: number | null) => {
    if (price === null) return "N/A";
    return `₦${(price / 100).toLocaleString()}`;
  };
  return (
    <div className="bg-white my-8 flex flex-col gap-6">
      {user && (
        <div className="border-gray-200 border shadow rounded-lg p-4 flex flex-col gap-6">
          {user.fullName && (
            <div>
              <p className="text-sm text-gray-600">Name</p>
              <div className="font-medium text-gray-900 mt-1">
                {user.fullName}
              </div>
            </div>
          )}
          {user.phoneNumbers.length > 0 && (
            <div>
              <p className="text-sm text-gray-600">Phone</p>
              <div className="font-medium text-gray-900 mt-1">
                {user.phoneNumbers[0]?.phoneNumber}
              </div>
            </div>
          )}
          {user.emailAddresses.length > 0 && (
            <div>
              <p className="text-sm text-gray-600">Email</p>
              <div className="font-medium text-gray-900 mt-1">
                {user.emailAddresses[0].emailAddress}
              </div>
            </div>
          )}
        </div>
      )}
      {selectedSeatId && selectedDate ? (
        <div className="border-gray-200 border shadow rounded-lg p-4 flex flex-col gap-6">
          <div>
            <h5 className="text-xl font-bold text-[#72A0A0]">09:00am</h5>
            <p>{selectedDate.toDateString()}</p>
            <p>Seat {selectedSeatId}</p>
          </div>
          <div>
            <h5 className="text-xl font-bold text-[#72A0A0]">05:00pm</h5>
            <p>{endDate?.toDateString()}</p>
          </div>
        </div>
      ) : null}
      <div className="border-gray-200 border rounded-lg p-4 flex flex-col gap-6">
        <div className="flex justify-between items-center">
          <p className="text-[#72A0A0]">Payment Status</p>
          <p>Not Paid</p>
        </div>
        <div className="flex justify-between items-center">
          <p className="text-[#72A0A0]">Price</p>
          <p>{formatPrice(price)}</p>
        </div>
      </div>
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
