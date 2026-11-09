// @vitest-environment node
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import {
  type InboxRow,
  type InboxSeverity,
  NotificationItem,
} from "./notification-item";

const row: InboxRow = {
  _id: "1",
  title: "Email delivery is paused",
  body: "ZeptoMail is out of credits.",
  createdAt: Date.now(),
};

const noop = () => undefined;

const render = (overrides: Partial<InboxRow> = {}, archived = false) =>
  renderToStaticMarkup(
    <NotificationItem
      row={{ ...row, ...overrides }}
      archived={archived}
      onOpen={noop}
      onArchive={noop}
      onRestore={noop}
    />,
  );

describe("NotificationItem severity icon", () => {
  const cases: Array<[InboxSeverity, string, string]> = [
    ["info", "info", "Info"],
    ["warning", "triangle-alert", "Warning"],
    ["critical", "octagon-alert", "Critical"],
  ];

  it.each(cases)("labels and icons a %s row", (severity, icon, label) => {
    const html = render({ severity });
    expect(html).toContain(`lucide-${icon}`);
    expect(html).toContain(`<span class="sr-only">${label}</span>`);
  });

  it("treats a row without severity as info", () => {
    const html = render();
    expect(html).toContain("lucide-info");
    expect(html).toContain('<span class="sr-only">Info</span>');
  });

  it("no longer renders the generic dot", () => {
    expect(render()).not.toContain("rounded-full bg-primary");
  });
});

describe("NotificationItem unread state", () => {
  it("highlights an unread row", () => {
    expect(render()).toContain("bg-primary/5");
  });

  it("does not highlight a read row", () => {
    expect(render({ readAt: Date.now() })).not.toContain("bg-primary/5");
  });
});

describe("NotificationItem archived state", () => {
  it("renders the restore action", () => {
    const html = render({ severity: "critical" }, true);
    expect(html).toContain('aria-label="Restore Email delivery is paused"');
    expect(html).toContain("lucide-archive-restore");
  });
});
