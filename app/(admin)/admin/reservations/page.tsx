"use client";

import { Reservations } from "@/components/Reservations";

type PageProps = {
  params: Promise<{
    id: string;
  }>;
};

const Page = ({ params }: PageProps) => {
  return (
    <>
      <section className="p-8">
        <h1 className="text-3xl font-bold mb-4">Reservations</h1>
      </section>

      <div className="px-8">
        <Reservations />
      </div>
    </>
  );
};

export default Page;
