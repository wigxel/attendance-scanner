import { Navbar } from '@/components/navbar';
import { TakeAttendance } from '@/components/TakeAttendance';
import type { Metadata } from 'next';

type PageProps = {
  params: {
    id: string;
  };
};

export const metadata: Metadata = {
  title: 'Admin',
};

const Page = ({ params }: PageProps) => {
  return (
    <>
      <main className="p-8">
        <h1 className="text-3xl font-bold mb-4">Dashboard</h1>
        <p>Welcome to your dashboard. Here you can view an overview of your application.</p>
      </main>

      <TakeAttendance />
    </>
  );
};

export default Page;
