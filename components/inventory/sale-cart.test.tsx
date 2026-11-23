// @vitest-environment jsdom

import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { SaleFormProduct } from "@/convex/inventory";
import { SaleCart } from "./sale-cart";

const { recordSale, clear, toastSuccess, cartState } = vi.hoisted(() => ({
  recordSale: vi.fn(),
  clear: vi.fn(),
  toastSuccess: vi.fn(),
  // Mirrors the real store's shape so tests can seed quantities and spy on clear.
  cartState: {
    quantities: {} as Record<string, number>,
    remove: vi.fn(),
    clear: null as unknown as ReturnType<typeof vi.fn>,
  },
}));
cartState.clear = clear;

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
  CustomerCombobox: () => null,
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
});

function renderCart() {
  return render(<SaleCart products={[product]} />);
}

describe("SaleCart", () => {
  it("stays on the page with a cleared cart after a successful save", async () => {
    cartState.quantities = { p1: 1 };
    recordSale.mockResolvedValue(undefined);
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
  });
});
