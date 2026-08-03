import { Webhook } from "https://esm.sh/standardwebhooks@1.0.0";
import { Resend } from "npm:resend@6.12.4";

import { appConfirmUrl } from "./confirm-url.ts";
import { normalizeHookSecret } from "./secret.ts";

type EmailAction =
  | "signup"
  | "invite"
  | "magiclink"
  | "recovery"
  | "email_change"
  | "reauthentication"
  | "password_changed_notification"
  | "email_changed_notification";

type HookPayload = {
  user: {
    email: string;
    new_email?: string;
  };
  email_data: {
    token: string;
    token_hash: string;
    redirect_to: string;
    email_action_type: EmailAction;
    site_url: string;
    token_new?: string;
    token_hash_new?: string;
  };
};

const resend = new Resend(Deno.env.get("RESEND_API_KEY") ?? "");
const sender =
  Deno.env.get("EMAIL_FROM") ??
  "Olea Connects™ <notifications@olivesocialimpact.com>";
const replyTo =
  Deno.env.get("EMAIL_REPLY_TO") ?? "hello@olivesocialimpact.com";

function escapeHtml(value: string) {
  return value.replace(
    /[&<>"']/g,
    (character) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;",
      })[character]!,
  );
}

function layout(input: {
  title: string;
  body: string;
  actionLabel?: string;
  actionUrl?: string;
  footer: string;
}) {
  const button =
    input.actionLabel && input.actionUrl
      ? `<p style="margin:28px 0"><a href="${escapeHtml(input.actionUrl)}" style="background:#285D40;border-radius:8px;color:#fff;display:inline-block;font-size:15px;font-weight:700;padding:13px 22px;text-decoration:none">${escapeHtml(input.actionLabel)}</a></p>`
      : "";

  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"></head>
<body style="background:#f4f6f8;color:#1f2937;font-family:Arial,sans-serif;margin:0;padding:24px">
<table role="presentation" width="100%"><tr><td align="center"><table role="presentation" width="100%" style="background:#fff;border:1px solid #e5e7eb;border-radius:14px;max-width:600px"><tr><td style="padding:30px 34px">
<p style="color:#285D40;font-size:19px;font-weight:800;margin:0 0 26px">Olea Connects™</p>
<h1 style="color:#172033;font-size:28px;line-height:1.2;margin:0 0 18px">${input.title}</h1>
<div style="color:#526079;font-size:15px;line-height:1.7">${input.body}</div>${button}
<p style="border-top:1px solid #e5e7eb;color:#7c8799;font-size:12px;line-height:1.6;margin:30px 0 0;padding-top:20px">${input.footer}</p>
</td></tr></table></td></tr></table></body></html>`;
}

function buildEmail(payload: HookPayload) {
  const { email_data: data } = payload;
  const url = appConfirmUrl(data, data.token_hash);
  const templates: Record<EmailAction, { subject: string; html: string; text: string }> = {
    signup: {
      subject: "Confirm your Olea Connects™ email",
      html: layout({
        title: "Confirm your email",
        body: "<p>Confirm your email address to finish activating your Olea Connects™ membership.</p>",
        actionLabel: "Confirm email",
        actionUrl: url,
        footer: "If you did not create this account, you can ignore this email.",
      }),
      text: `Confirm your Olea Connects™ email: ${url}`,
    },
    recovery: {
      subject: "Reset your Olea Connects™ password",
      html: layout({
        title: "Reset your password",
        body: "<p>We received a request to reset your Olea Connects™ password.</p>",
        actionLabel: "Reset password",
        actionUrl: url,
        footer: "If you did not request this reset, you can safely ignore this email.",
      }),
      text: `Reset your Olea Connects™ password: ${url}`,
    },
    invite: {
      subject: "You’re invited to Olea Connects™",
      html: layout({
        title: "You’re invited",
        body: "<p>You have been invited to join Olea Connects™.</p>",
        actionLabel: "Accept invitation",
        actionUrl: url,
        footer: "This secure invitation can only be used once.",
      }),
      text: `Accept your Olea Connects™ invitation: ${url}`,
    },
    magiclink: {
      subject: "Your Olea Connects™ sign-in link",
      html: layout({
        title: "Sign in to Olea Connects™",
        body: "<p>Use this secure link to sign in.</p>",
        actionLabel: "Sign in",
        actionUrl: url,
        footer: "If you did not request this link, you can ignore this email.",
      }),
      text: `Sign in to Olea Connects™: ${url}`,
    },
    email_change: {
      subject: "Confirm your new email address",
      html: layout({
        title: "Confirm your email change",
        body: `<p>Confirm the change to ${escapeHtml(payload.user.new_email ?? "your new email address")}.</p>`,
        actionLabel: "Confirm email change",
        actionUrl: url,
        footer: "If you did not request this change, contact Olea Connects™.",
      }),
      text: `Confirm your new Olea Connects™ email address: ${url}`,
    },
    reauthentication: {
      subject: `${data.token} is your Olea Connects™ verification code`,
      html: layout({
        title: "Your verification code",
        body: `<p>Use this code to verify your identity:</p><p style="color:#285D40;font-size:28px;font-weight:800;letter-spacing:5px">${escapeHtml(data.token)}</p>`,
        footer: "This code expires shortly and should not be shared.",
      }),
      text: `Your Olea Connects™ verification code is ${data.token}.`,
    },
    password_changed_notification: {
      subject: "Your Olea Connects™ password was changed",
      html: layout({
        title: "Password changed",
        body: "<p>Your Olea Connects™ password was changed successfully.</p>",
        footer: "If you did not make this change, contact Olea Connects™ immediately.",
      }),
      text: "Your Olea Connects™ password was changed. If this was not you, contact Olea Connects™ immediately.",
    },
    email_changed_notification: {
      subject: "Your Olea Connects™ email was changed",
      html: layout({
        title: "Email address changed",
        body: "<p>The email address on your Olea Connects™ account was changed.</p>",
        footer: "If you did not make this change, contact Olea Connects™ immediately.",
      }),
      text: "Your Olea Connects™ email address was changed. If this was not you, contact Olea Connects™ immediately.",
    },
  };

  return templates[data.email_action_type] ?? templates.magiclink;
}

function recipient(original: string) {
  const environment = Deno.env.get("EMAIL_ENVIRONMENT") ?? "development";
  if (environment === "production") return original;

  const testRecipient = Deno.env.get("EMAIL_TEST_RECIPIENT");
  if (!testRecipient) {
    throw new Error("EMAIL_TEST_RECIPIENT is required outside production.");
  }
  return testRecipient;
}

Deno.serve(async (request) => {
  if (request.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  try {
    const hookSecret = normalizeHookSecret(
      Deno.env.get("SEND_EMAIL_HOOK_SECRET") ?? "",
    );
    if (!hookSecret) throw new Error("SEND_EMAIL_HOOK_SECRET is not configured.");

    const rawBody = await request.text();
    const webhook = new Webhook(hookSecret);
    const payload = webhook.verify(
      rawBody,
      Object.fromEntries(request.headers),
    ) as HookPayload;
    const email = buildEmail(payload);
    const to = recipient(payload.user.email);
    const { error } = await resend.emails.send({
      from: sender,
      replyTo,
      to,
      subject: email.subject,
      html: email.html,
      text:
        to === payload.user.email
          ? email.text
          : `[Non-production email for ${payload.user.email}]\n\n${email.text}`,
      tags: [
        { name: "email_type", value: payload.email_data.email_action_type },
        {
          name: "environment",
          value: Deno.env.get("EMAIL_ENVIRONMENT") ?? "development",
        },
      ],
    });
    if (error) throw new Error(error.message);

    return Response.json({});
  } catch (error) {
    console.error("Unable to send authentication email", error);
    return Response.json(
      {
        error: {
          http_code: 500,
          message: error instanceof Error ? error.message : "Email failed.",
        },
      },
      { status: 500 },
    );
  }
});
