import { api } from "@/convex/_generated/api";
import { useQuery } from "convex/react";


export function useReadProfile() {
  return useQuery(api.myFunctions.getProfile);
}



export function useProfile() {
  const profile = useQuery(api.myFunctions.getProfile);


  return {
    isLoading: profile === undefined,
    data: profile
  }
}
