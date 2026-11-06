import type { Metadata } from "next";
import { RoleHas } from "@/components/RoleHas";
import { CashBookContent } from "./_components/cash-book-content";

export const metadata: Metadata = {
  title: "Cash book",
};

export default function CashBookPage() {
  return (
    <RoleHas privileges={["reports:read"]}>
      <div className="p-4 pt-0">
        <CashBookContent />
      </div>
    </RoleHas>
  );
}
