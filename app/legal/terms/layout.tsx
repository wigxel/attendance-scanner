import PublicHeader from "@/app/auth/_components/public-header";
import { body, mono } from "@/app/font";
import { Footer } from "@/components/footer";
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
