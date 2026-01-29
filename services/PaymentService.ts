import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { loadPaystackScript } from "@/lib/utils";
import type { ConvexHttpClient } from "convex/browser";

interface BookingArgs {
  userId: string;
  startDate: string;
  seatIds: Id<"seats">[];
  durationType: "day" | "week" | "month";
}

interface PaystackResponse {
  reference: string;
  trans: string;
  status: string;
  message: string;
  transaction: string;
  trxref: string;
  redirecturl: string;
}

interface PaystackConfig {
  key: string;
  email: string;
  amount: number | null;
  metadata: {
    name: string | null;
    email: string;
    seatId: Id<"seats">;
    date: string;
    endDate: string | undefined;
    price: string;
  };
  callback: (response: PaystackResponse) => void;
  onClose: () => void;
}

export class PaymentService {
  static async checkSeatAvailability(
    httpClient: ConvexHttpClient,
    seatId: Id<"seats">,
    startDate: string,
    durationType: string,
  ) {
    return await httpClient.query(api.seats.checkSeatAvailability, {
      seatId,
      startDate,
      durationType,
    });
  }

  static async createPendingBooking(
    httpClient: ConvexHttpClient,
    bookingArgs: BookingArgs,
  ) {
    return await httpClient.mutation(api.bookings.createBooking, bookingArgs);
  }

  static async confirmBooking(
    httpClient: ConvexHttpClient,
    bookingId: Id<"bookings">,
  ) {
    return await httpClient.mutation(api.bookings.confirmBooking, {
      bookingId,
    });
  }

  static async cancelBooking(
    httpClient: ConvexHttpClient,
    bookingId: Id<"bookings">,
  ) {
    return await httpClient.mutation(api.bookings.cancelBooking, { bookingId });
  }

  static async setupPaystack(config: PaystackConfig) {
    const loaded = await loadPaystackScript();
    if (!loaded) throw new Error("Payment service failed to load");

    // @ts-expect-error paystack
    return window.PaystackPop.setup(config);
  }
}
