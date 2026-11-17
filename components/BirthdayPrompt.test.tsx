// @vitest-environment node

import { useUser } from "@clerk/nextjs";
import { useQuery } from "convex/react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Dialog } from "@/components/ui/dialog";
import { BirthdayPrompt, BirthdayPromptBody } from "./BirthdayPrompt";

vi.mock("convex/react", () => ({
  useQuery: vi.fn(),
  useMutation: vi.fn(() => vi.fn()),
}));
vi.mock("@clerk/nextjs", () => ({ useUser: vi.fn() }));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn(), push: vi.fn() }),
  usePathname: () => "/account",
}));

const mockedQuery = vi.mocked(useQuery);
const mockedUser = vi.mocked(useUser);

beforeEach(() => {
  vi.clearAllMocks();
  mockedUser.mockReturnValue({
    user: null,
    isSignedIn: false,
    isLoaded: true,
  } as never);
});

describe("BirthdayPrompt", () => {
  it("renders nothing while the profile loads", () => {
    mockedQuery.mockReturnValue(undefined as never);
    expect(renderToStaticMarkup(<BirthdayPrompt />)).toBe("");
  });

  it("renders nothing once a birthday exists", () => {
    mockedQuery.mockReturnValue({ birthday: "11-17" } as never);
    expect(renderToStaticMarkup(<BirthdayPrompt />)).toBe("");
  });

  // The visible branch needs effects to run (dismissal state), so the dialog
  // body is asserted through its presentational export.
  it("dialog body asks the member with month/day picks and save", () => {
    const html = renderToStaticMarkup(
      <Dialog open>
        <BirthdayPromptBody onSave={vi.fn()} />
      </Dialog>,
    );
    expect(html).toContain("Is this your birth month?");
    expect(html).toContain("Month");
    expect(html).toContain("Day");
    expect(html).toContain("Save birthday");
  });
});
