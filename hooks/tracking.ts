import { encodeQRCodeData } from "@/app/actions/encrypt";
import { load } from "@fingerprintjs/fingerprintjs";
import { useQuery } from "@tanstack/react-query";
import React from "react";

type Result<A, E> =
  | { status: "loading"; data: undefined }
  | { status: "success"; data: A }
  | { status: "error"; error: Error };

type DeviceMeta = {
  browser: string;
  platform: string;
  visitorId: string;
};

export function useDeviceMeta() {
  const [result, setStatus] = React.useState<Result<DeviceMeta, unknown>>({
    status: "loading",
    data: undefined,
  });

  React.useEffect(() => {
    load()
      .then((fp) => fp.get())
      .then((fpResult) => {
        const platform =
          "value" in fpResult.components.platform
            ? fpResult.components.platform.value
            : "unknown";

        const vendor =
          "value" in fpResult.components.vendor
            ? fpResult.components.vendor.value
            : "unknown";

        const userAgentDataRaw = (
          fpResult.components as Record<string, { value?: unknown }>
        ).userAgentData;
        const userAgentData = userAgentDataRaw?.value as
          | { brands?: Array<{ brand?: string }> }
          | null
          | undefined;

        const browserName =
          userAgentData?.brands?.[0]?.brand ?? vendor ?? "unknown";

        const data: DeviceMeta = {
          browser: browserName,
          platform: platform,
          visitorId: fpResult.visitorId,
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

export type CustomerRegisterTuple = [
  string | undefined, // customer id
  string | undefined, // browser fingerprint (visitorId)
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
