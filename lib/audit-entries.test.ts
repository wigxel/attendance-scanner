import { describe, expect, it } from "vitest";
import { AuditEntry } from "./audit-entries";

describe("AuditEntry.create", () => {
  it("returns data as-is for default action", () => {
    const result = AuditEntry.create("booking.deleted", { amount: 100 });

    expect(result).toEqual({ amount: 100 });
  });

  it("attaches _highlight when highlights are provided", () => {
    const result = AuditEntry.create(
      "booking.deleted",
      { amount: 100, seatIds: ["a"] },
      ["amount"],
    );

    expect(result).toEqual({
      amount: 100,
      seatIds: ["a"],
      _highlight: ["amount"],
    });
  });

  it("omits _highlight when highlights array is empty", () => {
    const result = AuditEntry.create("booking.deleted", { amount: 100 }, []);

    expect(result).not.toHaveProperty("_highlight");
  });

  it("returns { vendor: 'clerk' } for profile.deleted", () => {
    const result = AuditEntry.create("profile.deleted");

    expect(result).toEqual({ vendor: "clerk" });
  });

  it("returns { vendor: 'clerk' } for user.deleted", () => {
    const result = AuditEntry.create("user.deleted");

    expect(result).toEqual({ vendor: "clerk" });
  });

  it("returns undefined for permission.deleted", () => {
    const result = AuditEntry.create("permission.deleted");

    expect(result).toBeUndefined();
  });

  it("returns undefined for role.deleted", () => {
    const result = AuditEntry.create("role.deleted");

    expect(result).toBeUndefined();
  });

  it("returns undefined for identity.deleted", () => {
    const result = AuditEntry.create("identity.deleted");

    expect(result).toBeUndefined();
  });

  it("returns {} when no data provided for default action", () => {
    const result = AuditEntry.create("unknown.action");

    expect(result).toEqual({});
  });

  it("ignores highlights for profile.deleted", () => {
    const result = AuditEntry.create("profile.deleted", undefined, ["vendor"]);

    expect(result).toEqual({ vendor: "clerk" });
    expect(result).not.toHaveProperty("_highlight");
  });

  it("ignores highlights for permission.deleted", () => {
    const result = AuditEntry.create("permission.deleted", undefined, ["name"]);

    expect(result).toBeUndefined();
  });
});

describe("AuditEntry.parse", () => {
  it("returns __v: 1 and empty fields for empty metadata", () => {
    const result = AuditEntry.parse({});

    expect(result).toEqual({ __v: 1, fields: [] });
  });

  it("parses amount as currency", () => {
    const result = AuditEntry.parse({ amount: 150000 });

    expect(result.fields).toContainEqual({
      kind: "currency",
      label: "Amount",
      value: 150000,
      preview: undefined,
    });
  });

  it("parses seatIds as count of array length", () => {
    const result = AuditEntry.parse({ seatIds: ["a", "b", "c"] });

    expect(result.fields).toContainEqual({
      kind: "count",
      label: "Seats",
      value: 3,
      preview: undefined,
    });
  });

  it("parses duration with durationType as unit", () => {
    const result = AuditEntry.parse({ duration: 30, durationType: "day" });

    expect(result.fields).toContainEqual({
      kind: "duration",
      label: "Duration",
      value: 30,
      unit: "day",
      preview: undefined,
    });
  });

  it("defaults duration unit to 'days' when durationType is absent", () => {
    const result = AuditEntry.parse({ duration: 14 });

    expect(result.fields).toContainEqual({
      kind: "duration",
      label: "Duration",
      value: 14,
      unit: "days",
      preview: undefined,
    });
  });

  it("skips durationType field (used only as context for duration)", () => {
    const result = AuditEntry.parse({ durationType: "month" });

    expect(result.fields).toHaveLength(0);
  });

  it("parses ownerUserId as id entity user with resolved name via context", () => {
    const result = AuditEntry.parse(
      { ownerUserId: "usr_123" },
      { owner: { firstName: "Alice", lastName: "Smith" } },
    );

    expect(result.fields).toContainEqual({
      kind: "id",
      label: "Owner",
      value: "Alice Smith",
      entity: "user",
      preview: undefined,
    });
  });

  it("falls back to raw id when no owner context for ownerUserId", () => {
    const result = AuditEntry.parse({ ownerUserId: "usr_123" });

    expect(result.fields).toContainEqual({
      kind: "id",
      label: "Owner",
      value: "usr_123",
      entity: "user",
      preview: undefined,
    });
  });

  it("parses userId as id entity user", () => {
    const result = AuditEntry.parse({ userId: "usr_abc" });

    expect(result.fields).toContainEqual({
      kind: "id",
      label: "User ID",
      value: "usr_abc",
      entity: "user",
      preview: undefined,
    });
  });

  it("parses bookingId as id entity booking", () => {
    const result = AuditEntry.parse({ bookingId: "bok_123" });

    expect(result.fields).toContainEqual({
      kind: "id",
      label: "Booking",
      value: "bok_123",
      entity: "booking",
      preview: undefined,
    });
  });

  it("parses ticketId as id entity ticket", () => {
    const result = AuditEntry.parse({ ticketId: "tkt_456" });

    expect(result.fields).toContainEqual({
      kind: "id",
      label: "Ticket",
      value: "tkt_456",
      entity: "ticket",
      preview: undefined,
    });
  });

  it("parses name as string", () => {
    const result = AuditEntry.parse({ name: "Engineer" });

    expect(result.fields).toContainEqual({
      kind: "string",
      label: "Name",
      value: "Engineer",
      preview: undefined,
    });
  });

  it("parses title as string", () => {
    const result = AuditEntry.parse({ title: "Add dark mode" });

    expect(result.fields).toContainEqual({
      kind: "string",
      label: "Title",
      value: "Add dark mode",
      preview: undefined,
    });
  });

  it("parses vendor as string", () => {
    const result = AuditEntry.parse({ vendor: "clerk" });

    expect(result.fields).toContainEqual({
      kind: "string",
      label: "Vendor",
      value: "clerk",
      preview: undefined,
    });
  });

  it("parses key as string with label Plan Key", () => {
    const result = AuditEntry.parse({ key: "monthly" });

    expect(result.fields).toContainEqual({
      kind: "string",
      label: "Plan Key",
      value: "monthly",
      preview: undefined,
    });
  });

  it("parses status as string with label Previous Status", () => {
    const result = AuditEntry.parse({ status: "cancelled" });

    expect(result.fields).toContainEqual({
      kind: "string",
      label: "Previous Status",
      value: "cancelled",
      preview: undefined,
    });
  });

  it("parses voteCount as number", () => {
    const result = AuditEntry.parse({ voteCount: 42 });

    expect(result.fields).toContainEqual({
      kind: "number",
      label: "Vote Count",
      value: 42,
      preview: undefined,
    });
  });

  it("parses ticketCount as number", () => {
    const result = AuditEntry.parse({ ticketCount: 3 });

    expect(result.fields).toContainEqual({
      kind: "number",
      label: "Ticket Count",
      value: 3,
      preview: undefined,
    });
  });

  it("handles unknown keys as string with capitalized label", () => {
    const result = AuditEntry.parse({ customField: "hello" });

    expect(result.fields).toContainEqual({
      kind: "string",
      label: "Custom Field",
      value: "hello",
      preview: undefined,
    });
  });

  it("skips null and undefined values", () => {
    const result = AuditEntry.parse({
      name: "Test",
      skipped: null,
      alsoSkipped: undefined,
    });

    expect(result.fields).toHaveLength(1);
    expect(result.fields[0]).toMatchObject({ label: "Name" });
  });

  it("skips _highlight key in fields output", () => {
    const result = AuditEntry.parse({ name: "Test", _highlight: ["name"] });

    const labels = result.fields.map((f) => f.label);
    expect(labels).not.toContain("Highlight");
    expect(labels).toContain("Name");
  });

  it("sets preview: true on highlighted fields", () => {
    const result = AuditEntry.parse({
      amount: 300000,
      seatIds: ["a", "b"],
      status: "active",
      _highlight: ["amount", "seatIds"],
    });

    expect(result.fields.find((f) => f.label === "Amount")?.preview).toBe(true);
    expect(result.fields.find((f) => f.label === "Seats")?.preview).toBe(true);
    expect(
      result.fields.find((f) => f.label === "Previous Status")?.preview,
    ).toBeUndefined();
  });

  it("parses full booking.deleted metadata correctly", () => {
    const result = AuditEntry.parse(
      {
        ownerUserId: "usr_1",
        seatIds: ["s1", "s2"],
        amount: 300000,
        duration: 30,
        durationType: "day",
        status: "active",
        ticketCount: 2,
        _highlight: ["amount", "seatIds", "duration"],
      },
      { owner: { firstName: "Bob", lastName: "Jones" } },
    );

    expect(result.fields).toHaveLength(6);
    expect(result.fields.find((f) => f.label === "Amount")).toMatchObject({
      kind: "currency",
      value: 300000,
      preview: true,
    });
    expect(result.fields.find((f) => f.label === "Seats")).toMatchObject({
      kind: "count",
      value: 2,
      preview: true,
    });
    expect(result.fields.find((f) => f.label === "Duration")).toMatchObject({
      kind: "duration",
      value: 30,
      unit: "day",
      preview: true,
    });
    expect(
      result.fields.find((f) => f.label === "Previous Status"),
    ).toMatchObject({
      kind: "string",
      value: "active",
      preview: undefined,
    });
    expect(result.fields.find((f) => f.label === "Ticket Count")).toMatchObject(
      {
        kind: "number",
        value: 2,
        preview: undefined,
      },
    );
    expect(result.fields.find((f) => f.label === "Owner")).toMatchObject({
      kind: "id",
      value: "Bob Jones",
      entity: "user",
      preview: undefined,
    });
  });
});

describe("AuditEntry create → parse round trip", () => {
  it("booking.deleted round-trips highlights correctly", () => {
    const metadata = AuditEntry.create(
      "booking.deleted",
      {
        amount: 15000,
        seatIds: ["s1"],
        duration: 1,
        durationType: "day",
        ownerUserId: "usr_1",
        status: "active",
        ticketCount: 1,
      },
      ["amount", "seatIds", "duration"],
    );

    const parsed = AuditEntry.parse(metadata!, {
      owner: { firstName: "A", lastName: "B" },
    });

    const previewFields = parsed.fields.filter((f) => f.preview);
    expect(previewFields).toHaveLength(3);
    expect(previewFields.map((f) => f.label)).toEqual([
      "Amount",
      "Seats",
      "Duration",
    ]);
  });

  it("profile.deleted renders only vendor field", () => {
    const metadata = AuditEntry.create("profile.deleted");

    const parsed = AuditEntry.parse(metadata!);

    expect(parsed.fields).toHaveLength(1);
    expect(parsed.fields[0]).toMatchObject({
      kind: "string",
      label: "Vendor",
      value: "clerk",
    });
  });

  it("no-metadata action creates empty parse result", () => {
    const metadata = AuditEntry.create("permission.deleted");

    const parsed = AuditEntry.parse(metadata ?? {});

    expect(parsed.fields).toHaveLength(0);
  });
});
