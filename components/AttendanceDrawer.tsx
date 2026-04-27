"use client";

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { useQuery } from "convex/react";
import { Skeleton } from "./ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./ui/table";

export function AttendanceDrawer({
  bookingId,
  isOpen,
  onClose,
}: {
  bookingId: Id<"bookings"> | null;
  isOpen: boolean;
  onClose: () => void;
}) {
  const attendance = useQuery(
    api.myFunctions.getAttendanceForBooking,
    bookingId ? { bookingId } : "skip",
  );

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent className="w-[400px] sm:w-[540px]">
        <SheetHeader>
          <SheetTitle>Attendance Details</SheetTitle>
        </SheetHeader>
        <div className="mt-4">
          {!attendance ? (
            <div className="space-y-4">
              <Skeleton className="h-8" />
              <Skeleton className="h-8" />
              <Skeleton className="h-8" />
            </div>
          ) : attendance.length === 0 ? (
            <p>No attendance records found for this booking.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Admitted By</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {attendance.map((record) => (
                  <TableRow key={record._id}>
                    <TableCell>
                      {new Date(record.timestamp).toLocaleDateString()}
                    </TableCell>
                    <TableCell>{record.userName}</TableCell>
                    <TableCell>{record.admitterName}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
