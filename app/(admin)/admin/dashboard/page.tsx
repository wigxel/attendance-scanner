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

      <div className="flex px-4 flex-col mt-8 md:grid-cols-4 md:grid gap-4">
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
