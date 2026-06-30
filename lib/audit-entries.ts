export type AuditEntryField =
  | { kind: "string"; label: string; value: string; preview?: boolean }
  | { kind: "number"; label: string; value: number; preview?: boolean }
  | { kind: "currency"; label: string; value: number; preview?: boolean }
  | { kind: "count"; label: string; value: number; preview?: boolean }
  | {
      kind: "duration";
      label: string;
      value: number;
      unit: string;
      preview?: boolean;
    }
  | {
      kind: "id";
      label: string;
      value: string;
      entity: string;
      preview?: boolean;
    };

export type AuditEntryParseResult = {
  __v: 1;
  fields: AuditEntryField[];
};

type ParseContext = {
  owner?: { firstName: string; lastName: string } | null;
};

function capitalize(key: string): string {
  return key
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (s) => s.toUpperCase())
    .trim();
}

export const AuditEntry = {
  create(
    action: string,
    data?: Record<string, unknown>,
    highlights?: string[],
  ): Record<string, unknown> | undefined {
    switch (action) {
      case "profile.deleted":
      case "user.deleted":
        return { vendor: "clerk" };
      case "permission.deleted":
      case "role.deleted":
      case "identity.deleted":
        return undefined;
      default: {
        const result = { ...(data ?? {}) };
        if (highlights && highlights.length > 0) {
          result._highlight = highlights;
        }
        return result;
      }
    }
  },

  parse(
    metadata: Record<string, unknown>,
    ctx: ParseContext = {},
  ): AuditEntryParseResult {
    const highlightKeys: string[] | undefined = metadata._highlight as
      | string[]
      | undefined;

    const fields: AuditEntryField[] = [];

    for (const [key, value] of Object.entries(metadata)) {
      if (value === undefined || value === null) continue;
      if (key === "_highlight") continue;

      const isPreview = highlightKeys?.includes(key) ? true : undefined;

      switch (key) {
        case "amount":
          fields.push({
            kind: "currency",
            label: "Amount",
            value: value as number,
            preview: isPreview,
          });
          break;
        case "seatIds":
          fields.push({
            kind: "count",
            label: "Seats",
            value: (value as unknown[]).length,
            preview: isPreview,
          });
          break;
        case "ticketCount":
          fields.push({
            kind: "number",
            label: "Ticket Count",
            value: value as number,
            preview: isPreview,
          });
          break;
        case "duration":
          fields.push({
            kind: "duration",
            label: "Duration",
            value: value as number,
            unit: String(metadata.durationType ?? "days"),
            preview: isPreview,
          });
          break;
        case "durationType":
          break;
        case "status":
          fields.push({
            kind: "string",
            label: "Previous Status",
            value: String(value),
            preview: isPreview,
          });
          break;
        case "ownerUserId":
          fields.push({
            kind: "id",
            label: "Owner",
            value: ctx.owner
              ? `${ctx.owner.firstName} ${ctx.owner.lastName}`
              : String(value),
            entity: "user",
            preview: isPreview,
          });
          break;
        case "userId":
          fields.push({
            kind: "id",
            label: "User ID",
            value: String(value),
            entity: "user",
            preview: isPreview,
          });
          break;
        case "bookingId":
          fields.push({
            kind: "id",
            label: "Booking",
            value: String(value),
            entity: "booking",
            preview: isPreview,
          });
          break;
        case "ticketId":
          fields.push({
            kind: "id",
            label: "Ticket",
            value: String(value),
            entity: "ticket",
            preview: isPreview,
          });
          break;
        case "name":
          fields.push({
            kind: "string",
            label: "Name",
            value: String(value),
            preview: isPreview,
          });
          break;
        case "title":
          fields.push({
            kind: "string",
            label: "Title",
            value: String(value),
            preview: isPreview,
          });
          break;
        case "voteCount":
          fields.push({
            kind: "number",
            label: "Vote Count",
            value: value as number,
            preview: isPreview,
          });
          break;
        case "vendor":
          fields.push({
            kind: "string",
            label: "Vendor",
            value: String(value),
            preview: isPreview,
          });
          break;
        case "key":
          fields.push({
            kind: "string",
            label: "Plan Key",
            value: String(value),
            preview: isPreview,
          });
          break;
        default:
          fields.push({
            kind: "string",
            label: capitalize(key),
            value: String(value),
            preview: isPreview,
          });
          break;
      }
    }

    return { __v: 1, fields };
  },
};
