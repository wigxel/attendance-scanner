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

const render = (severity?: InboxSeverity) =>
  renderToStaticMarkup(
    <NotificationItem
      row={{ ...row, severity }}
      onOpen={noop}
      onArchive={noop}
      onRestore={noop}
    />,
  );

describe("NotificationItem severity badge", () => {
  it("labels a critical row", () => {
    expect(render("critical")).toContain("Critical");
  });

  it("labels a warning row", () => {
    expect(render("warning")).toContain("Warning");
  });

  it("shows no badge for an info row or an old row without severity", () => {
    expect(render("info")).not.toContain("Warning");
    expect(render("info")).not.toContain("Critical");
    expect(render()).not.toContain("Warning");
  });
});
