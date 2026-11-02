"use node";
import { api, components, internal } from "./_generated/api";
import { type ActionCtx, internalAction } from "./_generated/server";

// Drains the notifications component queue. Runs on a 1-minute cron and
// right after anything enqueues (notifications.send schedules it). Email is
// Resend over plain fetch; push is the same web-push fan-out the temperature
// alerts used before.

const BATCH = 20;

type DeliveryRow = {
  _id: string;
  channel: "push" | "email";
  to?: string;
  title: string;
  body: string;
  url?: string;
};

type SubscriptionRow = { endpoint: string; p256dh: string; auth: string };

// retryable=false means retrying cannot help (bad config, no recipient),
// so the row goes straight to "failed" with the reason logged.
class SendError extends Error {
  constructor(
    message: string,
    readonly retryable: boolean,
  ) {
    super(message);
  }
}

const errorMessage = (error: unknown) =>
  error instanceof Error ? error.message : String(error);

export const deliver = internalAction({
  args: {},
  handler: async (ctx) => {
    const rows = (await ctx.runMutation(components.notifications.index.claim, {
      now: Date.now(),
      limit: BATCH,
    })) as DeliveryRow[];

    if (rows.length === 0) return null;

    const pushRows = rows.filter((row) => row.channel === "push");
    const subscriptions = pushRows.length
      ? ((await ctx.runQuery(
          api.push.listSubscriptions,
          {},
        )) as SubscriptionRow[])
      : [];
    const push = pushRows.length ? await setupPush() : null;

    for (const row of rows) {
      try {
        await deliverRow(ctx, row, push, subscriptions);
        await ctx.runMutation(components.notifications.index.markSent, {
          deliveryId: row._id,
        });
      } catch (error) {
        await ctx.runMutation(components.notifications.index.markFailed, {
          deliveryId: row._id,
          error: errorMessage(error),
          retryable: error instanceof SendError ? error.retryable : true,
        });
      }
    }

    // more waiting rows than we drained this pass
    if (rows.length === BATCH) {
      await ctx.scheduler.runAfter(0, internal.notificationSender.deliver, {});
    }
    return null;
  },
});

type PushSetup =
  | { webpush: Awaited<ReturnType<typeof loadWebpush>>; failure?: undefined }
  | { webpush?: undefined; failure: SendError };

const deliverRow = async (
  ctx: ActionCtx,
  row: DeliveryRow,
  push: PushSetup | null,
  subscriptions: SubscriptionRow[],
) => {
  if (row.channel === "push") return sendPush(ctx, push, subscriptions, row);
  return sendEmail(row);
};

// a missing key is a config problem, not a crash: every push row fails once
// with a readable reason instead of killing the whole drain
async function setupPush(): Promise<PushSetup> {
  try {
    return { webpush: await loadWebpush() };
  } catch (error) {
    return { failure: asSendError(error) };
  }
}

const asSendError = (error: unknown) =>
  error instanceof SendError
    ? error
    : new SendError(errorMessage(error), false);

async function loadWebpush() {
  // dynamic import: vitest's edge-runtime can't load web-push's node builtins
  // at import time. This file is imported by the test glob but only executed
  // in real node actions. web-push is CommonJS, so its API may hang off the
  // default export depending on interop.
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  if (!publicKey || !privateKey) {
    throw new SendError("VAPID keys are not set", false);
  }

  const webpushModule = await import("web-push");
  const webpush = (
    "default" in webpushModule ? webpushModule.default : webpushModule
  ) as typeof import("web-push");

  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT ?? "mailto:admin@example.com",
    publicKey,
    privateKey,
  );
  return webpush;
}

// Push is a broadcast today: every stored subscription gets every push
// delivery. Per-recipient routing needs a user key on pushSubscriptions.
async function sendPush(
  ctx: ActionCtx,
  push: PushSetup | null,
  subscriptions: SubscriptionRow[],
  row: DeliveryRow,
) {
  if (!push) throw new SendError("web-push is unavailable", false);
  if (push.failure) throw push.failure;
  const webpush = push.webpush;
  if (subscriptions.length === 0) {
    throw new SendError("no push subscriptions", false);
  }

  const payload = JSON.stringify({
    title: row.title,
    detail: row.body,
    url: row.url,
  });

  let delivered = 0;
  let retryable = false;

  for (const subscription of subscriptions) {
    try {
      await webpush.sendNotification(
        {
          endpoint: subscription.endpoint,
          keys: { p256dh: subscription.p256dh, auth: subscription.auth },
        },
        payload,
      );
      delivered++;
    } catch (error) {
      const statusCode = (error as { statusCode?: number }).statusCode;
      if (statusCode === 404 || statusCode === 410) {
        // browser subscription is gone — drop it, do not retry
        await ctx.runMutation(api.push.unsubscribe, {
          endpoint: subscription.endpoint,
        });
        continue;
      }
      retryable = true;
      console.error(
        `push send failed (${statusCode ?? "unknown"}): ${errorMessage(error).slice(0, 200)}`,
      );
    }
  }

  if (delivered === 0 && retryable) {
    throw new SendError("push delivery failed for every subscription", true);
  }
}

async function sendEmail(row: DeliveryRow) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) throw new SendError("RESEND_API_KEY is not set", false);
  if (!row.to) throw new SendError("delivery has no recipient email", false);

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: process.env.EMAIL_FROM ?? "Attendly <onboarding@resend.dev>",
      to: row.to,
      subject: row.title,
      html: renderEmail(row),
    }),
  });

  if (!response.ok) {
    const detail = (await response.text()).slice(0, 200);
    // 4xx other than 429 is a bad request — retrying will not help
    const retryable = response.status >= 500 || response.status === 429;
    throw new SendError(`resend ${response.status}: ${detail}`, retryable);
  }
}

function renderEmail(row: DeliveryRow) {
  const link = row.url
    ? `<p><a href="${escapeHtml(absoluteUrl(row.url))}">Open</a></p>`
    : "";
  const body = escapeHtml(row.body).replace(/\n/g, "<br>");
  return `<div style="font-family:system-ui,sans-serif;line-height:1.5"><h2>${escapeHtml(row.title)}</h2><p>${body}</p>${link}</div>`;
}

const absoluteUrl = (url: string) => {
  if (url.startsWith("http")) return url;
  const origin = process.env.APP_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? "";
  return `${origin}${url}`;
};

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
