import { ArrowRightIcon } from "lucide-react";
import Link from "next/link";
import { AuthChecker } from "@/components/auth-checker";
import { Footer } from "@/components/footer";
import { Header } from "@/components/header";
import { RoleIs } from "@/components/RoleIs";
import { Content } from "./content";

export default function Home() {
  return (
    <>
      <title>Customer Account | InSpace</title>
      <div className="fixed inset-0 z-0 scanline-container pointer-events-none" />
      <div className="z-[2] relative">
        <AuthChecker />

        <Header />

        <main className="px-4">
          <Content
            gotoAdmin={
              <RoleIs role={["admin", "manager"]}>
                <Link
                  href="/admin"
                  className="items-center text-sm font-semibold inline-flex self-start"
                >
                  <span>Goto Admin</span>
                  <ArrowRightIcon size="1em" />
                </Link>
              </RoleIs>
            }
          />
        </main>

        <Footer />
      </div>
    </>
  );
}
