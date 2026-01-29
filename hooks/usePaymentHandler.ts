import { CONFIG } from "@/app/reserve/constants";
import { setBookingId, useBookingStore } from "@/app/reserve/store";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { formatDateToLocalISO, loadPaystackScript } from "@/lib/utils";
import { useAuth, useUser } from "@clerk/nextjs";
import { ConvexHttpClient } from "convex/browser";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { toast } from "sonner";

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
    selectedSeatIds,
    selectedSeatNumbers,
    price,
    timePeriodString,
    bookingId,
  } = useBookingStore();
  const selectedDateString = useBookingStore((state) => state.selectedDate);
  const selectedDate = selectedDateString ? new Date(selectedDateString) : null;
  const endDateString = useBookingStore((state) => state.endDate);
  const endDate = endDateString ? new Date(endDateString) : null;

  type PaymentStatus = "pending" | "success" | "failed";

  const router = useRouter();
  const httpClient = new ConvexHttpClient(CONFIG.convexUrl);
  const [paymentMessage, setPaymentMessage] = useState("");
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>("pending");
  const [paymentLoading, setPaymentLoading] = useState(false);
  const { user } = useUser();
  const { getToken } = useAuth();

  const formatPrice = (price: number | null) => {
    if (price === null) return "N/A";
    return `₦${(price / 100).toLocaleString()}`;
  };

  const handleSuccessfulPayment = async (
    bookingIdToConfirm: Id<"bookings">,
  ) => {
    try {
      const token = await getToken({ template: "convex" });
      if (!token) {
        setPaymentMessage("Authentication error. Please log in again.");
        setPaymentStatus("failed");
        return;
      }

      httpClient.setAuth(token);
      await httpClient.mutation(api.bookings.confirmBooking, {
        bookingId: bookingIdToConfirm,
      });

      setPaymentStatus("success");
      setPaymentMessage("Payment successful!");
    } catch (error) {
      setPaymentStatus("failed");
      setPaymentMessage("Booking confirmation failed.");
      console.error("Booking confirmation failed:", error);
    }
  };

  /*
  const handleCancelBooking = async (bookingIdToCancel: Id<"bookings">) => {
    try {
      const token = await getToken({ template: "convex" });
      if (!token) {
        setPaymentMessage("Authentication error. Please log in again.");
        setPaymentStatus("failed");
        return;
      }

      httpClient.setAuth(token);
      await httpClient.mutation(api.bookings.cancelBooking, {
        bookingId: bookingIdToCancel,
      });

      setPaymentStatus("failed");
      setPaymentMessage("Booking cancelled!");
    } catch (error) {
      setPaymentStatus("failed");
      setPaymentMessage("Booking cancellation failed.");
      console.error("Booking cancellation failed:", error);
    }
  };
 */
  const handlePayment = async () => {
    try {
      setPaymentLoading(true);

      // Validation
      if (!user) {
        setPaymentStatus("pending");
        setPaymentMessage("Please login.");
        setPaymentLoading(false);
        return;
      }

      if (!selectedDate) {
        setPaymentStatus("pending");
        setPaymentMessage("Please select a date.");
        setPaymentLoading(false);
        return;
      }

      if (!selectedSeatIds || selectedSeatIds.length === 0) {
        setPaymentStatus("pending");
        setPaymentMessage("Please select at least one seat.");
        setPaymentLoading(false);
        return;
      }

      if (!timePeriodString) {
        setPaymentStatus("pending");
        setPaymentMessage("Please select a time period.");
        setPaymentLoading(false);
        return;
      }

      const token = await getToken({ template: "convex" });
      if (!token) {
        setPaymentMessage("Authentication error. Please log in again.");
        setPaymentStatus("failed");
        setPaymentLoading(false);
        return;
      }

      httpClient.setAuth(token);

      // Check availability for all seats
      for (const seatId of selectedSeatIds) {
        const seatAvailability = await httpClient.query(
          api.seats.checkSeatAvailability,
          {
            seatId,
            startDate: formatDateToLocalISO(selectedDate) || "",
            durationType: timePeriodString,
          },
        );

        if (seatAvailability?.isAvailable === false) {
          setPaymentStatus("pending");
          setPaymentMessage(
            "One or more seats are no longer available for the selected period",
          );
          setPaymentLoading(false);
          return;
        }
      }

      let bookingIdToUse = bookingId;

      // Check if booking exists and its status
      if (bookingId) {
        const existingBooking = await httpClient.query(
          api.bookings.getBooking,
          { bookingId },
        );

        // If booking is expired or doesn't exist, create a new one
        if (!existingBooking || existingBooking.status === "expired") {
          const bookingArgs = {
            userId: user?.id || "",
            startDate: formatDateToLocalISO(selectedDate) || "",
            seatIds: selectedSeatIds,
            durationType: timePeriodString,
          };

          const createBooking = await httpClient.mutation(
            api.bookings.createBooking,
            bookingArgs,
          );

          if (
            !createBooking.bookingIds ||
            createBooking.bookingIds.length === 0
          ) {
            setPaymentMessage("Failed to create booking.");
            setPaymentStatus("failed");
            setPaymentLoading(false);
            return;
          }

          bookingIdToUse = createBooking.bookingIds[0];
          setBookingId(bookingIdToUse);
        } else if (existingBooking.status === "pending") {
          // Update existing pending booking
          await httpClient.mutation(api.bookings.updateBooking, {
            bookingId,
            startDate: formatDateToLocalISO(selectedDate) || "",
            seatIds: selectedSeatIds,
            durationType: timePeriodString,
          });
        } else {
          // Booking is confirmed or cancelled, can't proceed
          setPaymentMessage(
            `Cannot proceed. Booking is already ${existingBooking.status}.`,
          );
          setPaymentStatus("failed");
          setPaymentLoading(false);
          return;
        }
      } else {
        // No bookingId exists, create a new booking
        const bookingArgs = {
          userId: user?.id || "",
          startDate: formatDateToLocalISO(selectedDate) || "",
          seatIds: selectedSeatIds,
          durationType: timePeriodString,
        };

        const createBooking = await httpClient.mutation(
          api.bookings.createBooking,
          bookingArgs,
        );

        if (
          !createBooking.bookingIds ||
          createBooking.bookingIds.length === 0
        ) {
          setPaymentMessage("Failed to create booking.");
          setPaymentStatus("failed");
          setPaymentLoading(false);
          return;
        }

        bookingIdToUse = createBooking.bookingIds[0];
        setBookingId(bookingIdToUse);
      }

      const loaded = await loadPaystackScript();
      if (!loaded) {
        setPaymentStatus("pending");
        setPaymentMessage(
          "Payment service failed to load. Please check your connection and try again.",
        );
        console.error(
          "Payment service failed to load. Please check your connection and try again.",
        );
        setPaymentLoading(false);
        return;
      }

      const totalPrice = price ? price * selectedSeatIds.length : 0;

      // @ts-expect-error paystack
      const paystack = window.PaystackPop.setup({
        key: CONFIG.paystackPublicKey,
        email: user?.emailAddresses[0].emailAddress,
        amount: totalPrice,
        metadata: {
          name: user?.fullName,
          email: user?.emailAddresses[0].emailAddress,
          bookingId: bookingIdToUse,
          seatIds: selectedSeatIds,
          seatNumbers: selectedSeatNumbers.join(", "),
          date: selectedDate?.toISOString(),
          endDate: endDate?.toISOString(),
          price: formatPrice(totalPrice),
          bookingCount: selectedSeatIds.length,
        },
        callback: (response: PaystackResponse) => {
          if (!bookingIdToUse) {
            console.error("Cannot confirm payment: bookingId is missing.");
            setPaymentMessage(
              "A critical error occurred. Booking ID is missing.",
            );
            setPaymentStatus("failed");
            setPaymentLoading(false);
            return;
          }
          if (response.status === "success") {
            handleSuccessfulPayment(bookingIdToUse);
          } else {
            setPaymentStatus("failed");
            setPaymentMessage("Payment was not successful");
          }
          setPaymentLoading(false);
        },
        onClose: () => {
          setPaymentLoading(false);
        },
      });

      paystack.openIframe();
    } catch (error) {
      toast.error("Payment error");
      console.error("Payment error:", error);
      setPaymentLoading(false);
    }
  };

  const returnToHomepage = () => {
    router.push("/");
  };

  return {
    paymentMessage,
    paymentStatus,
    user,
    handlePayment,
    returnToHomepage,
    formatPrice,
    bookingId,
    paymentLoading,
  };
};
