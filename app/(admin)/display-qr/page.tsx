import { currentUser } from "@clerk/nextjs/server";
import { notFound } from "next/navigation";
import { ConvexUserImpl } from "@/lib/user.model";
import DisplayQRCSR from "./page.client";

export default async function DisplayQRPage() {
  const user = await currentUser();

  if (!user) {
    notFound();
  }

  if (!["admin", "manager"].includes(ConvexUserImpl.role(user))) {
    notFound();
  }

  return <DisplayQRCSR />;
}
