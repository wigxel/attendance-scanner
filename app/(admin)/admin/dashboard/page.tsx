"use client";
import { TodaysCustomers } from "@/components/customers";
import { Feedbacks } from "@/components/feedbacks";
import { TakeAttendance } from "@/components/TakeAttendance";
import { TotalRevenue, TotalVisits } from "../customers/analytics";

type PageProps = {
  params: Promise<{
    id: string;
  }>;
};

const Page = ({ params }: PageProps) => {
  return (
    <>
      <section className="p-8">
        <h1 className="text-3xl font-bold mb-4">Dashboard</h1>
      </section>

      <div className="grid-cols-1 mt-8 md:grid-cols-4 grid gap-4">
        <div className="flex flex-col gap-4">
          <TakeAttendance />
          <TotalVisits />
          <TotalRevenue />
        </div>
        <TodaysCustomers />
        <Feedbacks />
      </div>
    </>
  );
};

export default Page;
