"use client"
import { TodaysCustomers } from "@/components/customers";
import { TakeAttendance } from "@/components/TakeAttendance";

type PageProps = {
  params: {
    id: string;
  };
};

const Page = ({ params }: PageProps) => {
  return (
    <>
      <section className="p-8">
        <h1 className="text-3xl font-bold mb-4">Dashboard</h1>
      </section>

      <div className="grid-cols-1 md:grid-cols-4 grid gap-4">
        <div>
          <TakeAttendance />
        </div>
        <TodaysCustomers />

      </div>
    </>
  );
};

export default Page;
