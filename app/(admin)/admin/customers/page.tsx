import {
  CustomersTable,
  TopCustomersAvatarGroup,
} from "@/components/customers";
import React from "react";
import { Analytics } from "./analytics";

export default function CustomersPage() {
  return (
    <div>
      <section className="p-8 flex justify-between">
        <div className="flex flex-col">
          <h1 className="text-3xl font-bold mb-4">Customers</h1>
          <p>Manage customers</p>
        </div>

        <div>
          <TopCustomersAvatarGroup />
        </div>
      </section>

      <Analytics />

      <CustomersTable />
    </div>
  );
}
