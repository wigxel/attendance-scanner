"use client";

import { useQuery } from "convex/react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { api } from "@/convex/_generated/api";
import { useProfile } from "@/hooks/auth";

export function ExpiryWarning() {
  const subscription = useQuery(api.bookings.myExpiringSubscription, {});
  const { data: profile, user } = useProfile();

  if (
    subscription === undefined ||
    subscription === null ||
    subscription.daysLeft > 7
  ) {
    return null;
  }

  const nameParts = [profile?.firstName, profile?.lastName].filter(
    (part): part is string => Boolean(part),
  );
  const name = nameParts.join(" ");
  const initials = nameParts
    .map((part) => part?.[0] ?? "")
    .slice(0, 2)
    .join("");

  return (
    <Alert>
      <div className="col-start-2 flex items-center gap-3">
        <Avatar className="h-9 w-9 shrink-0">
          {user?.imageUrl && (
            <AvatarImage src={user.imageUrl} alt={name || "Member"} />
          )}
          <AvatarFallback>{initials || "?"}</AvatarFallback>
        </Avatar>
        <div>
          <AlertTitle>Subscription expiring soon</AlertTitle>
          <AlertDescription>
            {subscription.daysLeft === 0
              ? `Expires today (${subscription.endDate})`
              : `Expires in ${subscription.daysLeft} days (${subscription.endDate})`}
          </AlertDescription>
        </div>
      </div>
    </Alert>
  );
}
