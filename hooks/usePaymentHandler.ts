import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth, useUser } from "@clerk/nextjs";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { ConvexHttpClient } from "convex/browser";
import { useBookingStore, setBookingId } from "@/app/reserve/store";
import { CONFIG } from "@/app/reserve/constants";
import { loadPaystackScript, formatDateToLocalISO } from "@/lib/utils";

interface PaystackResponse {
  reference: string;
  trans: string;
  status: string;
  message: string;
  transaction: string;
  trxref: string;
  redirecturl: string;
}

export const usePaymentHandler = () => {
  const {
    selectedSeatId,
    selectedDate,
    endDate,
    price,
    timePeriodString,
    bookingId,
  } = useBookingStore();
  type PaymentStatus = "pending" | "success" | "failed";

  const router = useRouter();
  const httpClient = new ConvexHttpClient(CONFIG.convexUrl);
  const [paymentMessage, setPaymentMessage] = useState("");
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>("pending");
  const { user } = useUser();
  const { getToken } = useAuth();
  const formatPrice = (price: number | null) => {
    if (price === null) return "N/A";
    return `₦${(price / 100).toLocaleString()}`;
  };

  const handleSuccessfulPayment = async (bookingId: Id<"bookings">) => {
    try {
      const token = await getToken({ template: "convex" });
      if (!token) {
        setPaymentMessage("Authentication error. Please log in again.");
        setPaymentStatus("failed");
        return;
      }
      httpClient.mutation(api.bookings.confirmBooking, { bookingId });

      setPaymentStatus("success");
      setPaymentMessage("Payment successful!");
    } catch (error) {
      setPaymentStatus("failed");
      setPaymentMessage("Booking failed.");
      console.error("Booking failed:", error);
    }
  };

  const handleCancelBooking: (
    bookingId: Id<"bookings">,
  ) => Promise<void> = async (bookingId: Id<"bookings">) => {
    try {
      const token = await getToken({ template: "convex" });
      if (!token) {
        setPaymentMessage("Authentication error. Please log in again.");
        setPaymentStatus("failed");
        return;
      }
      httpClient.mutation(api.bookings.cancelBooking, { bookingId });

      setPaymentStatus("failed");
      setPaymentMessage("Booking cancelled!");
    } catch (error) {
      setPaymentStatus("failed");
      setPaymentMessage("Booking cancellation failed.");
      console.error("Booking cancellation failed:", error);
    }
  };

  const handlePayment = async () => {
    try {
      if (selectedSeatId && selectedDate) {
        const token = await getToken({ template: "convex" });
        if (token) {
          httpClient.setAuth(token);

          const seatAvailability = await httpClient.query(
            api.seats.checkSeatAvailability,
            {
              seatId: selectedSeatId,
              startDate: formatDateToLocalISO(selectedDate) || "",
              durationType: timePeriodString,
            },
          );

          if (seatAvailability?.isAvailable === false) {
            setPaymentStatus("pending");
            setPaymentMessage(
              "Seat is no longer available for selected period",
            );
            return;
          }
        }
      }
      if (!user && !selectedDate && !selectedSeatId && !timePeriodString) {
        setPaymentStatus("pending");
        setPaymentMessage("Please select a user, date, seat, and time period.");
        return;
      }
      if (!user) {
        setPaymentStatus("pending");
        setPaymentMessage("Please login.");
        return;
      }
      if (!selectedDate) {
        setPaymentStatus("pending");
        setPaymentMessage("Please select a date.");
        return;
      }
      if (!selectedSeatId) {
        setPaymentStatus("pending");
        setPaymentMessage("Please select a seat.");
        return;
      }
      if (!timePeriodString) {
        setPaymentStatus("pending");
        setPaymentMessage("Please select a time period.");
        return;
      }

      const token = await getToken({ template: "convex" });
      if (!token) {
        setPaymentMessage("Authentication error. Please log in again.");
        setPaymentStatus("failed");
        return;
      }

      httpClient.setAuth(token);

      const bookingArgs = {
        userId: user?.id || "",
        startDate: formatDateToLocalISO(selectedDate) || "",
        seatIds: selectedSeatId ? [selectedSeatId] : [],
        durationType: timePeriodString,
      };

      const createBooking = await httpClient.mutation(
        api.bookings.createBooking,
        bookingArgs,
      );

      if (!createBooking.bookingIds || createBooking.bookingIds.length === 0) {
        setPaymentMessage("Failed to create booking.");
        setPaymentStatus("failed");
        return;
      }

      const bookingId = createBooking.bookingIds[0];
      setBookingId(bookingId);

      const loaded = await loadPaystackScript();
      if (!loaded) {
        setPaymentStatus("pending");
        setPaymentMessage(
          "Payment service failed to load. Please check your connection and try again.",
        );
        console.error(
          "Payment service failed to load. Please check your connection and try again.",
        );
        return;
      }

      // @ts-expect-error paystack
      const paystack = window.PaystackPop.setup({
        key: CONFIG.paystackPublicKey,
        email: user?.emailAddresses[0].emailAddress,
        amount: price,
        metadata: {
          name: user?.fullName,
          email: user?.emailAddresses[0].emailAddress,
          seatId: selectedSeatId,
          date: selectedDate?.toISOString(),
          endDate: endDate?.toISOString(),
          price: formatPrice(price),
        },
        callback: (response: PaystackResponse) => {
          if (response.status === "success") {
            handleSuccessfulPayment(bookingId);
          } else {
            setPaymentStatus("failed");
            setPaymentMessage("Payment was not successful");
          }
        },
        onClose: () => {
          handleCancelBooking(bookingId);
          console.log("Booking was cancelled");
        },
      });

      paystack.openIframe();
    } catch (error) {
      setPaymentStatus("failed");
      setPaymentMessage("Payment failed!");
      console.error("Payment error:", error);
    }
  };

  const returnToHomepage = () => {
    router.push("/");
    // Consider resetting the booking store state here
  };

  return {
    paymentMessage,
    paymentStatus,
    user,
    handlePayment,
    returnToHomepage,
    formatPrice,
    bookingId,
  };
};
