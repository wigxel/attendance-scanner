"use client";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { safeStr, serialNo } from "@/lib/data.helpers";
import type { ColumnDef } from "@tanstack/react-table";
import { CalendarIcon, EyeIcon, MoreVertical, User } from "lucide-react";

export type UserRow = {
  id: string;
  userId: string;
  firstname: string;
  lastname: string;
  email: string | null;
  phoneNumber: string | null;
  occupation: string;
  role: "admin" | "user" | null;
  visitCount: number;
  eligible: boolean;
};

interface ColumnActionsProps {
  onViewProfile: (userId: string) => void;
  onCreateBooking: (userId: string, userName: string) => void;
}

export function createColumns({
  onViewProfile,
  onCreateBooking,
}: ColumnActionsProps): ColumnDef<UserRow>[] {
  return [
    {
      accessorKey: "id",
      header: "S/N",
      cell: ({ row }) => <span>{serialNo(row.index + 1)}</span>,
    },
    {
      accessorKey: "firstName",
      header: "First Name",
      cell: ({ row }) => (
        <button
          type="button"
          className="appearance-none hover:underline"
          onClick={() => onViewProfile(row.original.userId)}
        >
          {row.getValue("firstName")} {safeStr(row.original?.lastname, "")}
        </button>
      ),
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
    // {
    //   accessorKey: "occupation",
    //   header: "Occupation",
    //   cell: ({ row }) => <span>{row.getValue("occupation")}</span>,
    // },
    // {
    //   accessorKey: "role",
    //   header: "Role",
    //   cell: ({ row }) => <span>{row.getValue("role")}</span>,
    // },
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
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => {
        const userId = row.original.userId;
        const firstName = row.original.firstname;
        const lastName = row.original.lastname;
        const userName = `${firstName} ${lastName}`;

        return (
          <div className="flex justify-end w-full">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>

              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => onViewProfile(userId)}>
                  <EyeIcon /> View Profile
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => {
                    return setTimeout(() => {
                      // this is important do not remove
                      return onCreateBooking(userId, userName);
                    }, 16);
                  }}
                >
                  <CalendarIcon /> Create Booking
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        );
      },
    },
  ];
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
