"use client";
import { TodaysCustomers } from "@/components/customers";
import { ExpiringSubscriptions } from "@/components/expiring-subscriptions";
import { Feedbacks } from "@/components/feedbacks";
import { MetricsChart } from "@/components/metrics";
import { TakeAttendance } from "@/components/TakeAttendance";
import {
  CashPayments,
  TotalRevenue,
  TotalVisits,
} from "../customers/analytics";

const Page = () => {
  return (
    <>
      <section className="px-8 pt-8">
        <h1 className="text-3xl font-bold mb-4">Dashboard</h1>
      </section>

      <div className="flex p-8 pt-0 flex-col md:grid md:grid-cols-6 gap-4">
        <div className="flex *:w-full items-stretch md:col-span-2">
          <TakeAttendance />
        </div>

        <div className="md:col-span-4">
          <MetricsChart />
        </div>

        <div className="md:col-span-2">
          <TotalVisits />
        </div>

        <div className="md:col-span-2">
          <TotalRevenue />
        </div>

        <div className="md:col-span-2">
          <CashPayments />
        </div>

        <div className="md:col-span-4">
          <TodaysCustomers />
        </div>

        <div className="md:col-span-2">
          <ExpiringSubscriptions />
        </div>

        <div className="md:col-span-6">
          <Feedbacks />
        </div>
      </div>
    </>
  );
};

export default Page;
