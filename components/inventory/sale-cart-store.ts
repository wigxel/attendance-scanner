import { create } from "zustand";
import { persist } from "zustand/middleware";

type SaleCartState = {
  /** Quantity per product, keyed by product id. */
  quantities: Record<string, number>;
  /** Applies a step to a product's quantity; zero or less removes the line. */
  adjust: (productId: string, mutate: (quantity: number) => number) => void;
  remove: (productId: string) => void;
  clear: () => void;
};

export const useSaleCart = create<SaleCartState>()(
  persist(
    (set) => ({
      quantities: {},
      adjust: (productId, mutate) =>
        set((state) => {
          const quantities = { ...state.quantities };
          const next = mutate(quantities[productId] ?? 0);

          if (next > 0) quantities[productId] = next;
          else delete quantities[productId];

          return { quantities };
        }),
      remove: (productId) =>
        set((state) => {
          const quantities = { ...state.quantities };
          delete quantities[productId];
          return { quantities };
        }),
      clear: () => set({ quantities: {} }),
    }),
    // Hydration is triggered from the page so the server and client render the
    // same empty cart before localStorage is read.
    { name: "sale-cart", skipHydration: true },
  ),
);
