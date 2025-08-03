import { body, mono } from "@/app/font";
import { Footer } from "@/components/footer";
import { PublicHeader } from "@/components/header";
import { cn } from "@/lib/utils";

const LayoutPage = ({ children }: { children: React.ReactNode }) => {
  return (
    <main className={cn(body.variable, mono.variable)}>
      <PublicHeader />
      {children}
      <Footer />
    </main>
  );
};

export default LayoutPage;
