import { api } from "@/convex/_generated/api";
import { useQuery } from "convex/react";


export function useProfile() {
  return useQuery(api.myFunctions.getProfile);
}
