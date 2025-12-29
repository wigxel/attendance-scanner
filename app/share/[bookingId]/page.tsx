"use client";
import { useQuery, useMutation } from "convex/react";
import { Id } from "@/convex/_generated/dataModel";
import { api } from "@/convex/_generated/api";
import { useParams } from "next/navigation";
import { useUser } from "@clerk/nextjs";

import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { toast } from "sonner";
import { LucideLoader, Check } from "lucide-react";

export default function SharePage() {
  const { bookingId } = useParams();
  const { user } = useUser();
  const data = useQuery(api.bookings.getBookingWithTickets, {
    bookingId: bookingId as Id<"bookings">,
  });
  const claimMutation = useMutation(api.bookings.claimTicket);

  if (!data)
    return (
      <>
        <div className="fixed inset-0 z-0 scanline-container pointer-events-none" />
        <div className="z-[2] relative">
          <Header />
          <main className="min-h-screen">
            <div className="h-96 rounded-lg flex justify-center items-center">
              <div className="bg-white rounded-full p-4">
                <LucideLoader
                  size={"2rem"}
                  strokeWidth={1}
                  className="animate animate-spin"
                />
              </div>
            </div>
          </main>
          <Footer />
        </div>
      </>
    );

  const handleClaim = async (ticketId: string) => {
    if (!user) return alert("Please sign in to claim a seat.");
    try {
      await claimMutation({ ticketId: ticketId as Id<"tickets"> });
      toast("Seat claimed successfully!");
    } catch (error) {
      toast("You have already claimed a seat in this booking.");
      console.error("Error claiming ticket:", error);
    }
  };

  const isPurchaser = user?.id === data.userId;

  return (
    <>
      <title>Share Booking | InSpace</title>
      <div className="fixed inset-0 z-0 scanline-container pointer-events-none" />
      <div className="z-[2] relative">
        <Header />
        <main className="max-w-xl mx-auto py-12 px-4 min-h-screen">
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200">
            <h1 className="text-2xl font-bold mb-2">Group Booking Invite</h1>
            <p className="text-gray-500 mb-6">
              {isPurchaser
                ? "Manage your booking and share this link with friends."
                : "You've been invited! Pick an open seat below."}
            </p>

            {isPurchaser && (
              <div className="bg-blue-50 p-4 rounded-lg mb-6 flex justify-between items-center">
                <span className="flex-1 text-sm font-medium text-[#0000FF] truncate pr-4">
                  {window.location.href}
                </span>
                <button
                  onClick={() =>
                    navigator.clipboard.writeText(window.location.href)
                  }
                  className="text-xs bg-[#0000FF] text-white px-3 py-1.5 rounded-md hover:bg-[#0000FF]/70 cursor-pointer"
                >
                  Copy Link
                </button>
              </div>
            )}

            <div className="space-y-3">
              {data.tickets.map((ticket) => {
                const isClaimed = !!ticket.holderUserId;
                const isMySeat = user?.id && ticket.holderUserId === user.id;

                return (
                  <div
                    key={ticket._id}
                    className={`flex items-center justify-between p-4 rounded-lg border ${
                      isClaimed
                        ? "bg-gray-50 border-gray-200"
                        : "bg-white border-green-200"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`px-3 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                          isClaimed
                            ? "bg-gray-200 text-gray-500"
                            : "bg-green-100 text-green-700"
                        }`}
                      >
                        <p>Seat {ticket.seatNumber}</p>
                      </div>
                      <div>
                        <p className="font-medium text-sm">
                          {isMySeat
                            ? "Your Seat"
                            : isClaimed
                              ? "Taken"
                              : "Available"}
                        </p>
                        {isClaimed && ticket.holderUserId === data.userId && (
                          <span className="text-xs text-gray-400">
                            Purchaser
                          </span>
                        )}
                      </div>
                    </div>

                    {!isClaimed ? (
                      <button
                        onClick={() => handleClaim(ticket._id)}
                        className="px-4 py-2 text-sm bg-black text-white rounded-lg cursor-pointer hover:bg-gray-800 transition-colors"
                      >
                        Claim
                      </button>
                    ) : (
                      isMySeat && (
                        <div className="text-green-600">
                          <Check size={20} />
                        </div>
                      )
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </main>
        <Footer />
      </div>
    </>
  );
}
