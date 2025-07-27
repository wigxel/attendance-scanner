import { CustomersTable } from "@/components/customers";
import React from "react";
import { Analytics } from "./analytics";

export default function CustomersPage() {
  return (
    <div>
      <section className="p-8">
        <h1 className="text-3xl font-bold mb-4">Customers</h1>
        <p>Manage customers</p>
      </section>

      <Analytics />

      <CustomersTable />
    </div>
  );
}
