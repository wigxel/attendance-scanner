"use client";

import { FlagsmithProvider as FlagsmithProviderBase } from "@flagsmith/flagsmith/react";
import type { IState } from "@flagsmith/flagsmith/types";
import { isNullable } from "effect/Predicate";
import React, { useEffect, useRef } from "react";
import { useAuthId } from "@/hooks/auth";
import { createFlagsmith, environmentID, hostAPI } from "@/services/flagsmith";

export function FlagsmithProvider({
  serverState,
  children,
}: {
  serverState?: IState;
  children: React.ReactNode;
}) {
  const auth = useAuthId();
  const [initialized, setInitialize] = React.useState(false);
  const flagsmith = useRef(createFlagsmith());

  useEffect(() => {
    flagsmith.current.init({
      environmentID,
      api: hostAPI,
      cacheFlags: true,
      preventFetch: !environmentID,
      realtime: true,
      onChange() {
        setInitialize(flagsmith.current.initialised ?? false);
      },
    });
  }, []);

  useEffect(() => {
    if (!initialized) return;
    if (auth.isLoading) return;

    if (isNullable(auth.id)) return;

    flagsmith.current.identify(auth.id);
  }, [initialized, auth.id, auth.isLoading]);

  return (
    <FlagsmithProviderBase
      // eslint-disable-next-line react-hooks/refs
      flagsmith={flagsmith.current}
      serverState={serverState}
    >
      {children}
    </FlagsmithProviderBase>
  );
}
