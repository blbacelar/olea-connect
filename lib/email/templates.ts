export type TransactionalEmail = {
  subject: string;
  html: string;
  text: string;
};

const brand = {
  green: "#446B52",
  light: "#F4EFE4",
  orange: "#D69A3A",
};

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

function layout({
  preheader,
  title,
  body,
  actionLabel,
  actionUrl,
  footer,
}: {
  preheader: string;
  title: string;
  body: string;
  actionLabel?: string;
  actionUrl?: string;
  footer: string;
}) {
  const action =
    actionLabel && actionUrl
      ? `<p style="margin:28px 0"><a href="${actionUrl}" style="background:${brand.orange};border-radius:8px;color:#1f2937;display:inline-block;font-size:15px;font-weight:700;padding:13px 22px;text-decoration:none">${actionLabel}</a></p>`
      : "";

  return `<!doctype html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>${title}</title></head>
<body style="background:#f4f6f8;color:#1f2937;font-family:Arial,sans-serif;margin:0;padding:24px">
<span style="display:none;max-height:0;overflow:hidden">${preheader}</span>
<table role="presentation" width="100%" cellspacing="0" cellpadding="0"><tr><td align="center">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#ffffff;border:1px solid #e5e7eb;border-radius:14px;max-width:600px">
<tr><td style="padding:30px 34px">
<p style="color:${brand.green};font-size:19px;font-weight:800;margin:0 0 26px">Olea Connects</p>
<h1 style="color:#172033;font-size:28px;line-height:1.2;margin:0 0 18px">${title}</h1>
<div style="color:#526079;font-size:15px;line-height:1.7">${body}</div>
${action}
<p style="border-top:1px solid #e5e7eb;color:#7c8799;font-size:12px;line-height:1.6;margin:30px 0 0;padding-top:20px">${footer}</p>
</td></tr></table>
</td></tr></table>
</body></html>`;
}

export function teamInvitationEmail(input: {
  organizationName: string;
  role: string;
  acceptUrl: string;
  expiresAt: string;
}): TransactionalEmail {
  const organizationName = escapeHtml(input.organizationName);
  const role = escapeHtml(input.role);
  const acceptUrl = escapeHtml(input.acceptUrl);
  const expiry = new Intl.DateTimeFormat("en-CA", {
    dateStyle: "long",
    timeStyle: "short",
    timeZone: "America/Edmonton",
  }).format(new Date(input.expiresAt));
  const subject = `You’re invited to join ${input.organizationName}`;
  const text = `You have been invited to join ${input.organizationName} as ${input.role}. Accept the invitation: ${input.acceptUrl}. This invitation expires ${expiry}.`;

  return {
    subject,
    text,
    html: layout({
      preheader: `Join ${organizationName} on Olea Connects.`,
      title: "You’re invited",
      body: `<p>${organizationName} invited you to collaborate as <strong>${role}</strong>.</p><p>This invitation expires ${expiry}.</p>`,
      actionLabel: "Accept invitation",
      actionUrl: acceptUrl,
      footer:
        "If you were not expecting this invitation, you can safely ignore this email.",
    }),
  };
}

export function eventScheduleChangeEmail(input: {
  eventTitle: string;
  startsAt: string;
  timezone: string;
  type: "event.canceled" | "event.rescheduled";
  webinarsUrl: string;
}): TransactionalEmail {
  const eventTitle = escapeHtml(input.eventTitle);
  const eventTime = new Intl.DateTimeFormat("en-CA", {
    dateStyle: "long",
    timeStyle: "short",
    timeZone: input.timezone,
  }).format(new Date(input.startsAt));
  const canceled = input.type === "event.canceled";
  const subject = canceled
    ? `${input.eventTitle} has been canceled`
    : `${input.eventTitle} has been rescheduled`;
  const text = canceled
    ? `${input.eventTitle} has been canceled. View your Olea Connects events: ${input.webinarsUrl}`
    : `${input.eventTitle} is now scheduled for ${eventTime}. View your Olea Connects events: ${input.webinarsUrl}`;

  return {
    subject,
    text,
    html: layout({
      preheader: subject,
      title: canceled ? "Event canceled" : "Event rescheduled",
      body: canceled
        ? `<p><strong>${eventTitle}</strong> has been canceled.</p><p>You can find your latest live sessions and recordings in Olea Connects.</p>`
        : `<p><strong>${eventTitle}</strong> has been rescheduled.</p><p>The new time is <strong>${eventTime}</strong>.</p>`,
      actionLabel: "View events",
      actionUrl: input.webinarsUrl,
      footer:
        "You received this because you registered for this Olea Connects event.",
    }),
  };
}

export const emailBrand = brand;
