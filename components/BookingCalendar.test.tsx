// @vitest-environment node

import { useQuery } from "convex/react";
import { isSameDay } from "date-fns";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useBookingStore } from "@/app/reserve/store";
import BookingCalendar from "./BookingCalendar";

const calendar = vi.hoisted(() => ({
  props: null as Record<string, unknown> | null,
}));
const proceed = vi.hoisted(() => ({ onClick: null as (() => void) | null }));
const toast = vi.hoisted(() => ({ error: vi.fn(), info: vi.fn() }));

vi.mock("convex/react", () => ({ useQuery: vi.fn() }));
vi.mock("sonner", () => ({ toast }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));
// zustand's SSR snapshot is frozen at creation, so the real persisted store
// cannot carry a pre-selected date into renderToStaticMarkup. This plain
// object mirrors the store's shape and lets tests seed and read it.
vi.mock("@/app/reserve/store", () => {
  const state = {
    activeTab: "booking",
    selectedDate: null as string | null,
    endDate: null as string | null,
    price: null as number | null,
    selectedSeatNumbers: [] as string[],
    selectedSeatIds: [] as string[],
    planKey: null as string | null,
    timePeriodString: "day",
    bookingId: null as string | null,
  };
  const useBookingStore = Object.assign(
    (selector?: (s: typeof state) => unknown) =>
      selector ? selector(state) : state,
    {
      getState: () => state,
      setState: (patch: Partial<typeof state>) => Object.assign(state, patch),
    },
  );
  const toISO = (date: Date | null) => (date ? date.toISOString() : null);
  return {
    useBookingStore,
    setSelectedDate: (date: Date | null) => {
      state.selectedDate = toISO(date);
    },
    setEndDate: (date: Date | null) => {
      state.endDate = toISO(date);
    },
    setPrice: (price: number | null) => {
      state.price = price;
    },
    setPlanKey: (key: string | null) => {
      state.planKey = key;
    },
    setTimePeriodString: (value: string) => {
      state.timePeriodString = value;
    },
    setActiveTab: (value: string) => {
      state.activeTab = value;
    },
  };
});
vi.mock("@/components/ui/calendar", () => ({
  Calendar: (props: Record<string, unknown>) => {
    calendar.props = props;
    return null;
  },
}));
vi.mock("@/components/ui/button", () => ({
  Button: ({ onClick }: { onClick?: () => void }) => {
    proceed.onClick = onClick ?? null;
    return null;
  },
}));

const mockedQuery = vi.mocked(useQuery);

const PLAN = {
  key: "day",
  name: "Day Pass",
  features: ["booking"],
  no_of_days: 1,
  price: 2500,
};

const BOOKED = new Date(2026, 10, 18);
const FREE = new Date(2026, 10, 19);

const mockData = (reserved: Date[] = []) => {
  mockedQuery.mockReset();
  mockedQuery.mockImplementationOnce(
    () => reserved.map((date) => date.toISOString()) as never,
  );
  mockedQuery.mockImplementationOnce(() => [PLAN] as never);
};

const render = () => renderToStaticMarkup(<BookingCalendar />);

beforeEach(() => {
  useBookingStore.setState({ selectedDate: null, planKey: null });
  vi.clearAllMocks();
});

afterEach(() => {
  useBookingStore.setState({ selectedDate: null, planKey: null });
});

describe("BookingCalendar", () => {
  it("renders a single-date picker and no period select before a date is chosen", () => {
    mockData();
    const html = render();

    expect(calendar.props?.mode).toBe("single");
    expect(html).toContain("Select a date to continue");
    expect(html).not.toContain("Reservation Period");
  });

  it("renders the Reservation Period select once a date is chosen", () => {
    mockData();
    useBookingStore.setState({ selectedDate: FREE.toISOString() });

    expect(render()).toContain("Reservation Period");
  });

  it("writes the picked day to the booking store", () => {
    mockData();
    render();

    const onSelect = calendar.props?.onSelect as (
      date: Date | undefined,
    ) => void;
    onSelect(FREE);

    expect(useBookingStore.getState().selectedDate).toBe(FREE.toISOString());
  });

  it("clears the store when the selected day is cleared", () => {
    mockData();
    useBookingStore.setState({ selectedDate: FREE.toISOString() });
    render();

    const onSelect = calendar.props?.onSelect as (
      date: Date | undefined,
    ) => void;
    onSelect(undefined);

    expect(useBookingStore.getState().selectedDate).toBeNull();
  });

  it("passes fully booked dates as a disabled matcher", () => {
    mockData([BOOKED]);
    render();

    const disabled = calendar.props?.disabled as Date[];

    expect(disabled.some((date) => isSameDay(date, BOOKED))).toBe(true);
    expect(disabled.some((date) => isSameDay(date, FREE))).toBe(false);
    expect(useBookingStore.getState().selectedDate).toBeNull();
  });

  it("shades Sunday with a muted modifier but keeps it selectable", () => {
    mockData();
    render();

    expect(calendar.props?.modifiers).toMatchObject({
      weekend: { dayOfWeek: [0] },
    });
    expect(calendar.props?.disabled).toHaveLength(0);
  });

  it("toasts when Proceed runs without a date", () => {
    mockData();
    render();

    proceed.onClick?.();

    expect(toast.error).toHaveBeenCalledWith("Please select a date");
  });

  it("toasts when Proceed runs on a Sunday", () => {
    mockData();
    useBookingStore.setState({
      selectedDate: new Date(2026, 10, 15).toISOString(),
    });
    render();

    proceed.onClick?.();

    expect(toast.info).toHaveBeenCalledWith(
      "Please select another date. We're closed on Sundays",
    );
  });

  it("styles the legend with theme tokens", () => {
    mockData();
    const html = render();

    expect(html).toContain("bg-primary");
    expect(html).not.toContain("bg-black");
    expect(html).not.toContain("bg-gray-100");
  });
});
