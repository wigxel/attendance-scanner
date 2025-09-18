import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import BookingCalendar from "@/components/BookingCalendar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const seats = [
  { seatNumber: "1", isOccupied: true },
  { seatNumber: "2", isOccupied: false },
  { seatNumber: "3", isOccupied: true },
  { seatNumber: "4", isOccupied: false },
  { seatNumber: "5", isOccupied: false },
  { seatNumber: "6", isOccupied: true },
];

function Content() {
  return (
    <div className="bg-white flex flex-col scanline-root max-w-lg mx-auto p-6 pb-14 rounded-2xl">
      <Tabs defaultValue="booking" className="w-full">
        <TabsList className="w-full">
          <TabsTrigger value="booking">Pick a Schedule</TabsTrigger>
          <TabsTrigger value="choose">Choose Seat</TabsTrigger>
          <TabsTrigger value="payment">Make Payment</TabsTrigger>
        </TabsList>
        <TabsContent value="booking">
          <PickScheduleTab />
        </TabsContent>
        <TabsContent value="choose">
          <PickSeatTab />
        </TabsContent>
        <TabsContent value="payment">
          <MakePaymentTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function PickScheduleTab() {
  return (
    <div>
      <BookingCalendar />
    </div>
  );
}

function PickSeatTab() {
  return seats.map((seat) => (
    <div key={seat.seatNumber}>
      <p>
        Seat {seat.seatNumber} is {seat.isOccupied ? "occupied" : "available"}
      </p>
    </div>
  ));
}

function MakePaymentTab() {
  return (
    <div>
      <p>Make payment here.</p>
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
