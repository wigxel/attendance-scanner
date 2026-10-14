"use client";

import { useQuery } from "convex/react";
import { format } from "date-fns";
import { TriangleAlert } from "lucide-react";
import Link from "next/link";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { api } from "@/convex/_generated/api";

export function ExpiryWarning() {
  const subscription = useQuery(api.bookings.myExpiringSubscription, {});

  if (subscription === undefined || subscription === null) {
    return null;
  }

  // Monthly plans warn 5 days out; weekly 2 — short plans need less runway.
  const warnAfter = subscription.durationType === "month" ? 5 : 2;
  if (subscription.daysLeft > warnAfter) {
    return null;
  }

  const endDate = format(new Date(subscription.endDate), "EEE d MMM yyyy");

  return (
    <Alert variant="warning">
      <TriangleAlert />
      <AlertTitle>Subscription expiring soon</AlertTitle>
      <AlertDescription className="text-muted-foreground!">
        {subscription.daysLeft === 0
          ? `Expires today (${endDate})`
          : `Expires in ${subscription.daysLeft} ${
              subscription.daysLeft === 1 ? "day" : "days"
            } (${endDate})`}
        {subscription.daysLeft === 0 && (
          <div className="mt-2">
            <Button asChild size="sm" className="h-7 px-2 text-xs">
              <Link href="/reserve">Renew now</Link>
            </Button>
          </div>
        )}
      </AlertDescription>
    </Alert>
  );
}
