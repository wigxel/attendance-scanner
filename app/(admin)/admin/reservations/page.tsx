"use client";

import { MonthlyReservationsTable } from "@/components/MonthlyReservationsTable";
import { Reservations } from "@/components/Reservations";
import { Button } from "@/components/ui/button";
import { getErrorMessage } from "@/lib/error.helpers";
import { GridIcon, ListIcon, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import React from "react";
import { ErrorBoundary, type FallbackProps } from "react-error-boundary";

function ReservationsErrorFallback({
  error,
  resetErrorBoundary,
}: FallbackProps) {
  return (
    <div className="p-6 border border-red-200 rounded-lg bg-red-50 m-4">
      <h3 className="text-lg font-semibold text-red-600">
        Failed to load reservations
      </h3>
      <p className="text-sm text-red-500 mt-1">
        {getErrorMessage(error) ?? "An unexpected error occurred"}
      </p>
      <Button
        onClick={resetErrorBoundary}
        variant="outline"
        className="mt-3 border-red-300 text-red-600 hover:bg-red-100"
      >
        Try again
      </Button>
    </div>
  );
}

function MonthlyReservationsErrorFallback({
  error,
  resetErrorBoundary,
}: FallbackProps) {
  return (
    <div className="p-6 border border-red-200 rounded-lg bg-red-50 m-4">
      <h3 className="text-lg font-semibold text-red-600">
        Failed to load reservations table
      </h3>
      <p className="text-sm text-red-500 mt-1">
        {getErrorMessage(error) ?? "An unexpected error occurred"}
      </p>
      <Button
        onClick={resetErrorBoundary}
        variant="outline"
        className="mt-3 border-red-300 text-red-600 hover:bg-red-100"
      >
        Try again
      </Button>
    </div>
  );
}

const Page = () => {
  const [tab, setTab] = React.useState<"list" | "grid">("list");
  const router = useRouter();

  return (
    <>
      <section className="p-8 justify-between flex">
        <h1 className="text-3xl font-bold mb-4">Reservations</h1>

        <div className="flex gap-4">
          <div className="inline-flex gap-1">
            <Button
              onClick={() => setTab("list")}
              variant={tab === "list" ? "outline" : "secondary"}
              size="icon"
            >
              <ListIcon />
            </Button>
            <Button
              onClick={() => setTab("grid")}
              variant={tab === "grid" ? "outline" : "secondary"}
              size="icon"
            >
              <GridIcon />
            </Button>
          </div>

          <Button
            onClick={() => router.push("/admin/bookings/create")}
            variant="default"
            className="gap-1"
          >
            <Plus className="h-4 w-4" />
            New Reservation
          </Button>
        </div>
      </section>

      <div className="px-4 md:px-8 gap-4">
        {tab === "list" ? (
          <ErrorBoundary FallbackComponent={MonthlyReservationsErrorFallback}>
            <MonthlyReservationsTable />
          </ErrorBoundary>
        ) : null}

        {tab === "grid" ? (
          <ErrorBoundary FallbackComponent={ReservationsErrorFallback}>
            <Reservations />
          </ErrorBoundary>
        ) : null}
      </div>
    </>
  );
};

export default Page;
