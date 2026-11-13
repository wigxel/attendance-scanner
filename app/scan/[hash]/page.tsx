import { currentUser } from "@clerk/nextjs/server";
import { notFound } from "next/navigation";
import { ConvexUserImpl } from "@/lib/user.model";
import StaffScanCheckIn from "./page.client";

/**
 * Landing page for a member's personal QR code, opened by staff scanning it
 * with their phone's camera app. Only admin/manager may register a member.
 */
export default async function ScanPage() {
  const user = await currentUser();

  if (!user) {
    notFound();
  }

  if (!["admin", "manager"].includes(ConvexUserImpl.role(user))) {
    notFound();
  }

  return <StaffScanCheckIn />;
}
