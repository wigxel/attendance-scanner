"use client";

import { MonthlyReservationsTable } from "@/components/MonthlyReservationsTable";
import { Reservations } from "@/components/Reservations";

const Page = () => {
  return (
    <>
      <section className="p-8">
        <h1 className="text-3xl font-bold mb-4">Reservations</h1>
      </section>

      <div className="px-8 gap-4 flex flex-col">
        <Reservations />
        <MonthlyReservationsTable />
      </div>
    </>
  );
};

export default Page;
