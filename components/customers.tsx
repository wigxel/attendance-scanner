"use client";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { columns } from "@/components/columns";
import { DataTableDemo } from "@/components/DataTable";

export function CustomersTable() {
  const users = useQuery(api.myFunctions.getAllUsers);

  if (!users) {
    return <div>Loading...</div>;
  }

  return (
    <div className="p-4">
      <h1 className="text-2xl font-semibold mb-4">
        Attendance
      </h1>

      <DataTableDemo />
      {/* <DataTable
        columns={columns}
        data={users.map((user) => ({
          ...user,
          firstname: user.firstName,
          lastname: user.lastName,
        }))}
      /> */}
    </div>
  );
}
