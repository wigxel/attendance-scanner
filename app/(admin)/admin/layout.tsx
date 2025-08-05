import { Footer } from "@/components/footer";
import { Header } from "@/components/header";
import { Navbar } from "@/components/navbar";
import { currentUser, type User } from "@clerk/nextjs/server";
import { notFound } from "next/navigation";

const ConvexUserImpl = {
  role(user: User) {
    return user?.privateMetadata?.role
  }
}


// @todo: Admin can upgrade any user to an Admin role
// @todo: Admin can see a list of administrator in the settings page

export default async function AdminLayout(props: { children: React.ReactNode }) {
  const user = await currentUser();

  if (!user) {
    notFound();
  }

  if (ConvexUserImpl.role(user) !== "admin") {
    notFound()
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
