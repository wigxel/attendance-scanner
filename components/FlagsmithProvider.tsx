"use client";

import { useAuth } from "@clerk/nextjs";
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
  const auth = useAuth();
  const flagsmith = useRef(createFlagsmith());

  useEffect(() => {
    flagsmith.current.init({
      environmentID,
      api: hostAPI,
      cacheFlags: true,
      preventFetch: !environmentID,
    });
  }, []);

  useEffect(() => {
    if (!auth.userId) return;
    if (!flagsmith.current.initialised) return;

    flagsmith.current.setState({
      api: hostAPI,
      identity: auth.userId ?? undefined,
    });
  }, [auth.userId]);

  return (
    <FlagsmithProviderBase
      flagsmith={flagsmith.current}
      serverState={serverState}
    >
      {children}
    </FlagsmithProviderBase>
  );
}
