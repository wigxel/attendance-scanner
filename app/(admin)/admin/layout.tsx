import { Footer } from "@/components/footer";
import { Header } from "@/components/header";
import { Navbar } from "@/components/navbar";

export default function AdminLayout(props: { children: React.ReactNode }) {
  return <>
    <Header />

    <Navbar />

    <main className="mx-auto container">
      {props.children}
    </main>

    <Footer />
  </>
}
