"use client";

import { CreateBookingForm } from "@/components/forms/CreateBookingForm";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { getErrorMessage } from "@/lib/error.helpers";
import { useMutation } from "convex/react";
import { ArrowLeft } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";

export default function CreateBookingPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectedUserId = searchParams.get("userId");

  const createManualBooking = useMutation(api.bookings.createManualBooking);

  const handleSubmit = async (values: {
    userId: string;
    planKey: string;
    startDate: string;
    seatId: Id<"seats">;
  }) => {
    try {
      await createManualBooking({
        userId: values.userId,
        planKey: values.planKey,
        startDate: values.startDate,
        seatId: values.seatId,
      });
      toast.success("Booking created successfully");
      router.push("/admin/reservations");
    } catch (error) {
      toast.error("Error creating booking", {
        description: getErrorMessage(error),
        duration: 40000,
      });
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6 mt-8 px-4 md:px-8">
      <div className="flex items-start gap-2 flex-col">
        <Button variant="ghost" onClick={() => router.back()}>
          <ArrowLeft className="h-5 w-5" />
          <span className="text-xs">BACK</span>
        </Button>

        <h1 className="text-3xl font-bold indent-3">Create Booking</h1>
      </div>

      <Card className="flex flex-col gap-8">
        <CardContent className="pt-8">
          <CreateBookingForm
            preselectedUserId={preselectedUserId}
            onSubmit={handleSubmit}
            onCancel={() => router.push("/admin/reservations")}
          />
        </CardContent>
      </Card>
    </div>
  );
}
