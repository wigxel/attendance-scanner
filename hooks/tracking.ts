import { encodeQRCodeData } from "@/app/actions/encrypt";
import { safeArray } from "@/lib/data.helpers";
import { load } from "@fingerprintjs/fingerprintjs";
import { useQuery } from "@tanstack/react-query";
import React from "react";

type A = Partial<{ browser: string; visitorId: string }>;
type Result<A, E> =
  | { status: "loading"; data: undefined }
  | { status: "success"; data: A }
  | { status: "error"; error: Error };

export function useDeviceMeta() {
  const [result, setStatus] = React.useState<Result<A, unknown>>({
    status: "loading",
    data: undefined,
  });

  React.useEffect(() => {
    load()
      .then((result) => result.get())
      .then((result) => {
        const values =
          "value" in result.components.vendorFlavors
            ? safeArray(result.components.vendorFlavors.value)
            : ["unknown"];

        const data: DeviceMeta = {
          browser: values.join("/"),
          visitorId: result.visitorId,
        };

        setStatus({ status: "success", data });
      })
      .catch((error) => {
        setStatus({ status: "error", error });
      });
  }, []);

  return {
    isLoading: result.status === "loading",
    ...result,
  };
}

type DeviceMeta = {
  browser: string;
  visitorId: string;
};

export type CustomerRegisterTuple = [
  string | undefined, // customer id
  string | undefined, // browser fingerprint
  string | undefined, // browser name
  string | undefined, // access plan
  string | undefined, // date-month-year
];

export function useQueryHash(
  data: CustomerRegisterTuple,
  opts: { enabled: boolean },
) {
  return useQuery({
    queryKey: data,
    queryFn: () => encodeQRCodeData(data),
    enabled: opts.enabled,
    retryDelay: 3000,
    retry: 3,
  });
}
