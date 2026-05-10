"use client";
import { DateRange } from "@/components/DateRange";
import {
  CustomersTable,
  TopCustomersAvatarGroup,
} from "@/components/customers";
import { Button } from "@/components/ui/button";
import React from "react";
import {
  ErrorBoundary,
  type FallbackProps,
  getErrorMessage,
} from "react-error-boundary";
import { Analytics } from "./analytics";

function CustomersTableErrorFallback({
  error,
  resetErrorBoundary,
}: FallbackProps) {
  return (
    <div className="p-6 border border-red-200 rounded-lg bg-red-50 m-4">
      <h3 className="text-lg font-semibold text-red-600">
        Failed to load customers
      </h3>
      <p className="text-sm text-red-500 mt-1">
        {getErrorMessage(error) || "An unexpected error occurred"}
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

export default function CustomersPage() {
  return (
    <DateRange.Provider>
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

        <ErrorBoundary FallbackComponent={CustomersTableErrorFallback}>
          <CustomersTable />
        </ErrorBoundary>
      </div>
    </DateRange.Provider>
  );
}
