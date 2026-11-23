// @vitest-environment jsdom

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const route = vi.hoisted(() => ({ pathname: "/admin/inventory/sales" }));

vi.mock("next/navigation", () => ({ usePathname: () => route.pathname }));

import { InventorySubNav } from "./inventory-sub-nav";

afterEach(() => {
  cleanup();
});

function link(name: string) {
  return screen.getByText(name).closest("a") as HTMLAnchorElement;
}

describe("InventorySubNav", () => {
  it("lists Point of Sale, linking to the record-sale page", () => {
    route.pathname = "/admin/inventory/sales";
    render(<InventorySubNav canManage={false} />);

    expect(link("Point of Sale").getAttribute("href")).toBe(
      "/admin/inventory/sales/new",
    );
  });

  it("activates Point of Sale on the record-sale page, not Sales", () => {
    route.pathname = "/admin/inventory/sales/new";
    render(<InventorySubNav canManage={false} />);

    expect(link("Point of Sale").getAttribute("aria-current")).toBe("page");
    expect(link("Sales").getAttribute("aria-current")).toBeNull();
  });

  it("activates Sales on the sales list, not Point of Sale", () => {
    route.pathname = "/admin/inventory/sales";
    render(<InventorySubNav canManage={false} />);

    expect(link("Sales").getAttribute("aria-current")).toBe("page");
    expect(link("Point of Sale").getAttribute("aria-current")).toBeNull();
  });
});
