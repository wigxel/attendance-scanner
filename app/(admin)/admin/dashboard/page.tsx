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

      <div className="grid-cols-4 grid gap-4">
        <TakeAttendance />
        <TodaysCustomers />
      </div>
    </>
  );
};

export default Page;
