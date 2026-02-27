"use client";
import { CustomerAvatar } from "@/components/customers";
import { Footer } from "@/components/footer";
import { Header } from "@/components/header";
import { If } from "@/components/if";
import { Button } from "@/components/ui/button";
import { api } from "@/convex/_generated/api";
import type { Doc, Id } from "@/convex/_generated/dataModel";
import { useProfile } from "@/hooks/auth";
import { currencyFormatter } from "@/lib/currency.helpers";
import { DateParse } from "@/lib/date.helpers";
import { getErrorMessage } from "@/lib/error.helpers";
import { O } from "@/lib/fp.helpers";
import { cn } from "@/lib/utils";
import { useMutation, useQuery } from "convex/react";
import { Calendar, Check, Clock, LucideLoader, UserMinus2 } from "lucide-react";
import { useParams } from "next/navigation";
import { toast } from "sonner";

export default function SharePage() {
  const { bookingId } = useParams();
  const auth_profile = useProfile();
  const data = useQuery(api.bookings.getBookingWithTickets, {
    bookingId: bookingId as Id<"bookings">,
  });

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

  const payerId = data.userId;
  const authUserId = O.fromNullable(auth_profile.data?.id);
  const isPurchaser = auth_profile?.data?.id === payerId;
  const { owner = [], invitees = [] } = Object.groupBy(
    data.tickets,
    (ticket) => (ticket.holderUserId === payerId ? "owner" : "invitees"),
  );
  const purchaser_ticket = owner[0];

  const isMySeat = (ticket_uid?: string) =>
    authUserId.pipe(
      O.map((auth_user_id) => auth_user_id === ticket_uid),
      O.getOrElse(() => false),
    );

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
                : ""}
            </p>

            {isPurchaser && (
              <div className="bg-gray-100 border-gray-200 border py-2 ps-4 pe-2 rounded-lg mb-6 flex justify-between items-center">
                <span className="flex-1 text-sm font-medium text-[black] truncate pr-4">
                  {window.location.href}
                </span>

                <Button
                  size="sm"
                  onClick={() => {
                    return navigator.clipboard.writeText(window.location.href);
                  }}
                >
                  Copy Link
                </Button>
              </div>
            )}

            <div className="grid grid-cols-2 gap-y-4 gap-x-8 mb-8 p-5 bg-gray-50/50 rounded-2xl border border-gray-100">
              <div className="space-y-1">
                <p className="text-[10px] uppercase tracking-wider font-bold text-gray-400">
                  Duration
                </p>
                <div className="flex items-center gap-2 text-sm font-medium text-gray-900 capitalize">
                  <Clock className="w-3.5 h-3.5 text-gray-400" />
                  {data.duration} {data.durationType}(s)
                </div>
              </div>

              <div className="space-y-1 text-right sm:text-left">
                <p className="text-[10px] uppercase tracking-wider font-bold text-gray-400">
                  Status
                </p>
                <div className="flex items-center sm:justify-start justify-end gap-2 text-sm font-medium text-gray-900 capitalize">
                  <div
                    className={`w-1.5 h-1.5 rounded-full ${data.status === "confirmed" ? "bg-green-500" : "bg-yellow-500"}`}
                  />
                  {data.status}
                </div>
              </div>

              <div className="space-y-1">
                <p className="text-[10px] uppercase tracking-wider font-bold text-gray-400">
                  Amount
                </p>
                <div className="text-sm font-medium text-gray-900">
                  {currencyFormatter.format(data.amount / 100)}
                </div>
              </div>

              <div className="space-y-1 text-right sm:text-left">
                <p className="text-[10px] uppercase tracking-wider font-bold text-gray-400">
                  Dates
                </p>
                <div className="flex items-center sm:justify-start justify-end gap-2 text-sm font-medium text-gray-900">
                  <Calendar className="w-3.5 h-3.5 text-gray-400" />
                  <span>
                    {DateParse.presets
                      .dateOnly(data.startDate)
                      .pipe(O.getOrElse(() => ""))}{" "}
                    -{" "}
                    {DateParse.presets
                      .dateOnly(data.endDate)
                      .pipe(O.getOrElse(() => ""))}
                  </span>
                </div>
              </div>
            </div>

            {purchaser_ticket ? (
              <section>
                <h4 className="font-medium mb-2 text-sm">Booked by</h4>
                <SlotItem
                  user_mode={"owner"}
                  view_mode={isPurchaser ? "owner" : "invitee"}
                  currentUser={auth_profile.data}
                  isMySeat={isMySeat(purchaser_ticket.holderUserId)}
                  canClaim={false}
                  isClaimed={true}
                  data={purchaser_ticket}
                />
              </section>
            ) : null}

            <div className="my-4 border-t-[1px] border-gray-200" />

            <section>
              <h4 className="font-medium mb-2 text-sm">
                Invitees <If cond={!isPurchaser}>— Claim a seat below.</If>
              </h4>

              <ul className="space-y-3">
                {invitees.map((ticket) => {
                  const isClaimed = !!ticket.holderUserId;

                  return (
                    <SlotItem
                      key={ticket._id}
                      user_mode={
                        ticket.holderUserId === payerId ? "owner" : "invitee"
                      }
                      view_mode={isPurchaser ? "owner" : "invitee"}
                      currentUser={auth_profile.data}
                      canClaim={!isPurchaser}
                      isMySeat={isMySeat(ticket.holderUserId)}
                      isClaimed={isClaimed}
                      data={ticket}
                    />
                  );
                })}
              </ul>
            </section>
          </div>
        </main>
        <Footer />
      </div>
    </>
  );
}

function SlotItem({
  user_mode,
  view_mode,
  data: ticket,
  currentUser: user,
  canClaim = false,
  isClaimed = false,
  isMySeat = false,
}: {
  view_mode: "owner" | "invitee";
  user_mode: "owner" | "invitee";
  isClaimed: boolean;
  canClaim: boolean;
  isMySeat: boolean;
  data: Doc<"tickets">;
  currentUser: Doc<"profile"> | null | undefined;
}) {
  const claimMutation = useMutation(api.bookings.claimTicket);
  const removeClaimMutation = useMutation(api.bookings.removeClaim);
  const a = useProfile();
  const ticket_profile = useQuery(api.myFunctions.getUserById, {
    userId: ticket.holderUserId ?? "",
  });

  const removeClaim = async (ticketId: Doc<"tickets">["_id"]) => {
    if (view_mode !== "owner")
      return toast.warning("Only a purchaser can remove a claim");

    try {
      await removeClaimMutation({ ticketId: ticketId });
      toast.success("Ticket claim revoked");
    } catch (error) {
      toast.error("We can't seem to unassign this ticket");
      console.error("Error claiming ticket:", getErrorMessage(error));
    }
  };

  const handleClaim = async (ticketId: string) => {
    if (!user) return toast.warning("Please sign in to claim a seat.");

    try {
      await claimMutation({ ticketId: ticketId as Id<"tickets"> });
      toast("Seat claimed successfully!");
    } catch (error) {
      toast("You have already claimed a seat in this booking.");
      console.error("Error claiming ticket:", getErrorMessage(error));
    }
  };

  return (
    <li
      className={cn(
        `flex items-center justify-between p-4 rounded-lg border`,
        isClaimed ? "bg-gray-50 border-gray-200" : "bg-white border-green-200",
      )}
    >
      <div className="flex flex-col items-start gap-2">
        <div className="flex text-sm">Seat #{ticket.seatNumber}</div>

        <p className="font-medium text-sm">
          {isMySeat || isClaimed ? (
            ticket_profile ? (
              <div className="flex gap-2 items-center">
                <CustomerAvatar userId={ticket_profile.id} />
                <span>
                  {ticket_profile.firstName} {ticket_profile.lastName}
                </span>
              </div>
            ) : (
              "Seat Taken"
            )
          ) : (
            "Available"
          )}
        </p>
      </div>

      <div className="flex gap-2 items-center">
        <If
          cond={view_mode === "owner" && isClaimed && user_mode === "invitee"}
        >
          <Button
            size="icon"
            type="button"
            variant="outline"
            title="Reclaim Ticket"
            onClick={() => removeClaim(ticket._id)}
          >
            <UserMinus2 />
          </Button>
        </If>

        {!isClaimed ? (
          <Button
            // size=""
            type="button"
            variant="default"
            disabled={!canClaim}
            onClick={() => handleClaim(ticket._id)}
          >
            Claim
          </Button>
        ) : (
          isMySeat && (
            <div className="text-primary">
              <Check size={20} />
            </div>
          )
        )}
      </div>
    </li>
  );
}
