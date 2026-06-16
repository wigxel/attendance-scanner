"use client";

import { FlagsmithProvider as FlagsmithProviderBase } from "@flagsmith/flagsmith/react";
import type { IState } from "@flagsmith/flagsmith/types";
import { useEffect, useRef } from "react";
import { createFlagsmith, environmentID, hostAPI } from "@/services/flagsmith";

export function FlagsmithProvider({
  serverState,
  children,
}: {
  serverState?: IState;
  children: React.ReactNode;
}) {
  const flagsmith = useRef(createFlagsmith());

  useEffect(() => {
    flagsmith.current.init({
      environmentID,
      api: hostAPI,
      cacheFlags: true,
      preventFetch: !environmentID,
    });
  }, []);

  return (
    <FlagsmithProviderBase
      flagsmith={flagsmith.current}
      serverState={serverState}
    >
      {children}
    </FlagsmithProviderBase>
  );
}
