import { useMutation, useQuery } from "convex/react";
import { differenceInMinutes, format } from "date-fns";
import { api } from "@/convex/_generated/api";

export function useTodaysRegistration() {
  return useQuery(api.selfService.getTodaysRegistration);
}

export function useSelfCheckIn() {
  return useMutation(api.selfService.selfCheckIn);
}

export function useSelfCheckOut() {
  return useMutation(api.selfService.selfCheckOut);
}

export function useTodaysRating() {
  return useQuery(api.selfService.getTodaysRating);
}

export function formatDuration(checkIn: string, checkOut: string) {
  const mins = differenceInMinutes(checkOut, checkIn);
  const hours = Math.floor(mins / 60);
  const minutes = mins % 60;
  if (hours === 0) return `${minutes}m`;
  return `${hours}h ${minutes}m`;
}

export function formatTime(iso: string) {
  return format(new Date(iso), "hh:mm a");
}
