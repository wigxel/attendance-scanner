"use client";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { columns } from "@/components/columns";
import { DataTableDemo } from "@/components/DataTable";
import { safeArray, serialNo } from "@/lib/data.helpers";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";

export function useUsers() {
  const record = useQuery(api.myFunctions.getAllUsers);

  return { data: safeArray(record) };
}

export function CustomersTable() {
  const { data: users } = useUsers();

  if (!users) {
    return <div>Loading...</div>;
  }

  return (
    <div className="p-4">
      <DataTableDemo
        columns={columns}
        data={users.map((user) => ({
          ...user,
          firstname: user.firstName,
          lastname: user.lastName,
        }))}
      />
    </div>
  );
}

export function TodaysCustomers() {
  const { data: users } = useUsers();

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <span>Today</span>&nbsp;&nbsp;
          <span className="text-muted-foreground font-mono font-normal">
            {serialNo(users.length)}
          </span>
        </CardTitle>
      </CardHeader>

      <CardContent className="p-0">
        <ul>
          {users.map((e) => {
            return (
              <li key={e.id} className="flex items-center group gap-4 pt-2 px-4">
                <Avatar className="w-10 h-10">
                  <AvatarImage
                    src={"undefined"}
                    alt="User Avatar"
                    className="object-cover"
                  />
                  <AvatarFallback>{CustomerImpl.initials(e)}</AvatarFallback>
                </Avatar>

                <div className="group-last:border-none border-b flex items-center flex-1 pb-2">
                  <div className="flex-1">
                    <div className="font-semibold">
                      {e.firstName} {e.lastName}
                    </div>

                    <div className="text-sm text-gray-500">
                      Total visits: {e.visitCount}
                    </div>
                  </div>

                  <div className="text-sm text-foreground">
                    3 mins
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      </CardContent>
    </Card>
  );
}

const CustomerImpl = {
  initials: (customer: { firstName: string; lastName: string }) => {
    return `${customer.firstName.charAt(0)}${customer.lastName.charAt(0)}`;
  },
};
