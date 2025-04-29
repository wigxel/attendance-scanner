"use client";
import { ColumnDef } from "@tanstack/react-table";

export type UserRow = {
  id: string;
  firstname: string;
  lastname: string;
  email: string | null;
  phoneNumber: string | null;
  occupation: string;
  role: "admin" | "user" | null;
  visitCount: number;
  eligible: boolean;
}

export const columns: ColumnDef<UserRow>[] = [
  {
    accessorKey: "firstName",
    header: "First Name",
    cell: ({ row }) => <span>{row.getValue("firstName")}</span>,
  },
  {
    accessorKey: "lastName",
    header: "Last Name",
    cell: ({ row }) => <span>{row.getValue("lastName")}</span>,
  },
  {
    accessorKey: "email",
    header: "Email",
    cell: ({ row }) => <span>{row.getValue("email")}</span>,
  },
  {
    accessorKey: "phoneNumber",
    header: "Phone Number",
    cell: ({ row }) => <span>{row.getValue("phoneNumber")}</span>,
  },
  {
    accessorKey: "occupation",
    header: "Occupation",
    cell: ({ row }) => <span>{row.getValue("occupation")}</span>,
  },
  {
    accessorKey: "role",
    header: "Role",
    cell: ({ row }) => <span>{row.getValue("role")}</span>,
  },
  {
    accessorKey: "visitCount",
    header: "Visit Count",
    cell: ({ row }) => <span>{row.getValue("visitCount")}</span>,
  },
  {
    accessorKey: "eligible",
    header: "Free Day Eligible",
    cell: ({ row }) => <span>{row.getValue("eligible") ? "Yes" : "No"}</span>,
  },
];