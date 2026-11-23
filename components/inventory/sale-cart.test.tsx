// @vitest-environment jsdom

import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { SaleFormProduct } from "@/convex/inventory";
import { track } from "@/lib/analytics";
import { SaleCart } from "./sale-cart";

const { recordSale, clear, toastSuccess, cartState, combobox } = vi.hoisted(
  () => ({
    recordSale: vi.fn(),
    clear: vi.fn(),
    toastSuccess: vi.fn(),
    // Mirrors the real store's shape so tests can seed quantities and spy on clear.
    cartState: {
      quantities: {} as Record<string, number>,
      remove: vi.fn(),
      clear: null as unknown as ReturnType<typeof vi.fn>,
    },
    combobox: vi.fn(),
  }),
);
cartState.clear = clear;

// jsdom here exposes no localStorage; stub the surface the cart uses.
const backing = new Map<string, string>();
globalThis.localStorage = {
  getItem: (k: string) => backing.get(k) ?? null,
  setItem: (k: string, v: string) => backing.set(k, v),
  clear: () => backing.clear(),
} as unknown as Storage;

// jsdom lacks the browser APIs Radix positions with.
class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
globalThis.ResizeObserver =
  ResizeObserverStub as unknown as typeof ResizeObserver;

vi.mock("convex/react", () => ({
  useMutation: () => recordSale,
  useQuery: () => undefined,
}));
vi.mock("sonner", () => ({ toast: { success: toastSuccess, error: vi.fn() } }));
vi.mock("@/lib/analytics", () => ({ track: vi.fn() }));
vi.mock("@/components/forms/CustomerCombobox", () => ({
  CustomerCombobox: (props: Record<string, unknown>) => {
    combobox(props);
    return null;
  },
}));
vi.mock("./sale-cart-store", () => ({
  useSaleCart: (selector: (state: typeof cartState) => unknown) =>
    selector(cartState),
}));

const product: SaleFormProduct = {
  productId: "p1",
  name: "Peak Milk",
  sku: "MILK-1",
  sellPriceKobo: 40000,
  baseUnitId: "u1",
  stockQty: 5,
  units: [{ unitId: "u1", name: "pack", abbreviation: "pk", factorToBase: 1 }],
};

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  localStorage.clear();
});

function renderCart() {
  return render(<SaleCart products={[product]} />);
}

describe("SaleCart", () => {
  it("stays on the page with a cleared cart after a successful save", async () => {
    cartState.quantities = { p1: 1 };
    recordSale.mockResolvedValue("s1");
    renderCart();

    fireEvent.click(screen.getByRole("button", { name: "Record sale" }));

    await waitFor(() =>
      expect(toastSuccess).toHaveBeenCalledWith("Sale recorded"),
    );
    expect(clear).toHaveBeenCalled();
    // The cart keeps the user on /sales/new: the button re-arms for the next
    // sale instead of navigating back to the sales list.
    await waitFor(() =>
      expect(
        screen
          .getByRole("button", { name: "Record sale" })
          .hasAttribute("disabled"),
      ).toBe(false),
    );
    expect(recordSale).toHaveBeenCalledTimes(1);
    expect(track).toHaveBeenCalledWith(
      "inventory_sale_recorded",
      expect.objectContaining({
        sale_id: "s1",
        channel: "cash",
        amount_kobo: 40000,
        line_count: 1,
      }),
    );
  });

  it("pre-fills the remembered last customer on mount", () => {
    localStorage.setItem("inspace:last-customer", "c9");
    renderCart();

    const latest = combobox.mock.calls.at(-1)?.[0] as { value: string };
    expect(latest.value).toBe("c9");
  });

  it("remembers the customer of a named sale for the next visit", async () => {
    cartState.quantities = { p1: 1 };
    recordSale.mockResolvedValue("s1");
    renderCart();

    // Pick a customer through the combobox, then record the sale.
    const pick = combobox.mock.calls.at(-1)?.[0] as {
      onChange: (id: string) => void;
    };
    act(() => pick.onChange("c3"));
    fireEvent.click(screen.getByRole("button", { name: "Record sale" }));

    await waitFor(() => expect(toastSuccess).toHaveBeenCalled());
    expect(localStorage.getItem("inspace:last-customer")).toBe("c3");
  });

  it("keeps a walk-in sale from overwriting the remembered customer", async () => {
    localStorage.setItem("inspace:last-customer", "c3");
    cartState.quantities = { p1: 1 };
    recordSale.mockResolvedValue("s1");
    renderCart();

    fireEvent.click(screen.getByRole("button", { name: "Record sale" }));

    await waitFor(() => expect(toastSuccess).toHaveBeenCalled());
    expect(localStorage.getItem("inspace:last-customer")).toBe("c3");
  });
});
