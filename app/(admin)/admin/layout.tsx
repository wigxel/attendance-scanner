import { Footer } from "@/components/footer";
import { Header } from "@/components/header";
import { Navbar } from "@/components/navbar";

export default function AdminLayout(props: { children: React.ReactNode }) {
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
