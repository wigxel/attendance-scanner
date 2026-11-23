// @vitest-environment jsdom

import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CustomerCombobox } from "./CustomerCombobox";

const { useQuery, useMutation } = vi.hoisted(() => ({
  // Controlled per test: undefined = loading, null = no such customer.
  useQuery: vi.fn(),
  useMutation: vi.fn(),
}));

type WithChildren = { children: React.ReactNode };

vi.mock("convex/react", () => ({ useQuery, useMutation }));
vi.mock("@/components/ui/button", () => ({
  Button: ({ children }: WithChildren) => <span>{children}</span>,
}));
vi.mock("@/components/ui/popover", () => ({
  Popover: ({ children }: WithChildren) => <div>{children}</div>,
  PopoverTrigger: ({ children }: WithChildren) => <div>{children}</div>,
  PopoverContent: ({ children }: WithChildren) => <div>{children}</div>,
}));
vi.mock("@/components/ui/command", () => ({
  Command: ({ children }: WithChildren) => <div>{children}</div>,
  CommandInput: () => <input />,
  CommandList: ({ children }: WithChildren) => <div>{children}</div>,
  CommandEmpty: ({ children }: WithChildren) => <div>{children}</div>,
  CommandGroup: ({ children }: WithChildren) => <div>{children}</div>,
  CommandItem: ({ children }: WithChildren) => <div>{children}</div>,
}));
vi.mock("@/components/loader", () => ({ AppSpinner: () => <span /> }));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("CustomerCombobox", () => {
  it("drops a remembered value that matches no customer", () => {
    useQuery.mockReturnValue(null); // getUserById: customer is gone
    const onChange = vi.fn();
    render(<CustomerCombobox value="gone-id" onChange={onChange} />);

    expect(onChange).toHaveBeenCalledWith("");
  });

  it("keeps a value that resolves to a customer", () => {
    useQuery.mockReturnValue({ firstName: "Ada", lastName: "Obi" });
    const onChange = vi.fn();
    render(<CustomerCombobox value="c1" onChange={onChange} />);

    expect(onChange).not.toHaveBeenCalled();
  });
});
