import { safeArray } from "@/lib/data.helpers";
import { load } from "@fingerprintjs/fingerprintjs";
import React from "react";
import { useQuery } from '@tanstack/react-query'
import { encodeQRCodeData } from "@/app/actions/encrypt";

type A = Partial<{ browser: string, visitorId: string }>;
type Result<A, E> =
  { status: "loading", data: undefined } |
  { status: "success", data: A } |
  { status: "error", error: Error };

export function useDeviceMeta() {
  const [result, setStatus] = React.useState<Result<A, unknown>>({ status: "loading", data: undefined });

  React.useEffect(() => {
    load().then(result => result.get())
      .then(result => {
        const values = 'value' in result.components.vendorFlavors ?
          safeArray(result.components.vendorFlavors.value) : ["unknown"]

        const data = ({
          browser: values.join("/"),
          visitorId: result.visitorId
        })

        setStatus({ status: "success", data })
      }).catch((error) => {
        setStatus({ status: "error", error })
      });
  }, [])

  return {
    isLoading: result.status === "loading",
    ...result
  }
}

export function useQueryHash(data: unknown[]) {
  return useQuery({
    queryKey: data,
    queryFn: () => encodeQRCodeData(data)
  })
}
