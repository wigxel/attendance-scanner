import { currentUser } from "@clerk/nextjs/server";
import { notFound } from "next/navigation";
import { Footer } from "@/components/footer";
import { Header } from "@/components/header";
import { Navbar } from "@/components/navbar";
import { ConvexUserImpl } from "@/lib/user.model";

export default async function AdminLayout(props: {
  children: React.ReactNode;
}) {
  const user = await currentUser();

  if (!user) {
    notFound();
  }

  if (!["admin", "manager"].includes(ConvexUserImpl.role(user))) {
    notFound();
  }

  return (
    <div className="scanline-container relative">
      <Header />

      <Navbar />

      <main className="mx-auto container min-h-[calc(100svh_-_150px)]">
        {props.children}
      </main>

      <Footer />
    </div>
  );
}
