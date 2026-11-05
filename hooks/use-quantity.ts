import type {
  ComponentProps,
  KeyboardEvent as ReactKeyboardEvent,
} from "react";
import { useCallback, useEffect, useMemo, useRef } from "react";

export type MutateFn = (value: number) => number;
type Updater = (mutate: MutateFn) => void;

type ChangeEvents = Pick<
  ComponentProps<"button">,
  "onMouseDown" | "onMouseUp" | "onMouseLeave" | "onKeyDown" | "onKeyUp"
>;

const HOLD_DELAY_MS = 200;

/**
 * Press-and-hold stepper events for +/- buttons. A single click moves one step;
 * holding repeats it every 200ms. Keyboard activation never repeats.
 */
export function useQuantity({
  onAdjust,
  step = 1,
}: {
  onAdjust: Updater;
  step?: number;
}) {
  const timers = useRef<ReturnType<typeof setInterval>[]>([]);

  const stop = useCallback(() => {
    for (const timer of timers.current) clearInterval(timer);
    timers.current = [];
  }, []);

  useEffect(() => stop, [stop]);

  const bind = useCallback(
    (mutate: MutateFn) =>
      (update: Updater): ChangeEvents => {
        const apply = (repeat: boolean) => {
          update(mutate);

          if (repeat) {
            timers.current.push(
              setInterval(() => update(mutate), HOLD_DELAY_MS),
            );
          }
        };

        return {
          onMouseDown: () => apply(true),
          onMouseUp: stop,
          onMouseLeave: stop,
          onKeyDown: (event: ReactKeyboardEvent<HTMLButtonElement>) => {
            if (event.key !== " " && event.key !== "Enter") return;
            apply(false);
          },
          onKeyUp: stop,
        };
      },
    [stop],
  );

  const decrement = useMemo(
    () => bind((value) => value - step)(onAdjust),
    [bind, step, onAdjust],
  );
  const increment = useMemo(
    () => bind((value) => value + step)(onAdjust),
    [bind, step, onAdjust],
  );

  return [decrement, increment] as const;
}
