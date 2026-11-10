import "server-only";

import type { MembershipTier } from "@/lib/types";

export interface SignupAlert {
  email: string;
  fullName: string;
  organizationName: string;
  tier: MembershipTier;
  referralCode: string;
}

type SlackResponse = {
  ok?: boolean;
  error?: string;
  ts?: string;
};

function getSlackConfig() {
  const token = process.env.SLACK_SIGNUP_BOT_TOKEN?.trim();
  const destinationId = process.env.SLACK_SIGNUP_DESTINATION_ID?.trim();
  const notifyUserId = process.env.SLACK_SIGNUP_NOTIFY_USER_ID?.trim();

  if (!token && !destinationId && !notifyUserId) return null;
  if (
    !token ||
    !destinationId ||
    !notifyUserId ||
    !/^[UCDG][A-Z0-9]{8,}$/.test(destinationId) ||
    !/^U[A-Z0-9]{8,}$/.test(notifyUserId)
  ) {
    throw new Error("Slack signup alert configuration is incomplete or invalid.");
  }

  return { token, destinationId, notifyUserId };
}

function safeLine(value: string, maxLength: number) {
  return value.replace(/[\r\n\t\x00-\x1f\x7f]/g, " ").trim().slice(0, maxLength);
}

export function buildSignupAlertMessage(alert: SignupAlert, notifyUserId: string) {
  const lines = [
    "A new Olea Connects account was created.",
    `Name: ${safeLine(alert.fullName, 160)}`,
    `Email: ${safeLine(alert.email, 254)}`,
    `Organization: ${safeLine(alert.organizationName, 160)}`,
    `Selected plan: ${safeLine(alert.tier, 30)}`,
    ...(alert.referralCode
      ? [`Referral code: ${safeLine(alert.referralCode, 80)}`]
      : []),
    "Status: Email verification and payment may still be pending.",
    `Environment: ${safeLine(process.env.VERCEL_ENV ?? process.env.NODE_ENV ?? "development", 30)}`,
  ];

  return {
    text: "New Olea Connects signup",
    blocks: [
      {
        type: "header",
        text: { type: "plain_text", text: "New Olea Connects signup", emoji: false },
      },
      {
        type: "section",
        text: { type: "mrkdwn", text: `<@${notifyUserId}> a new account was created.` },
      },
      {
        type: "section",
        text: { type: "plain_text", text: lines.join("\n"), emoji: false },
      },
    ],
  };
}

export async function sendSignupSlackAlert(alert: SignupAlert) {
  const config = getSlackConfig();
  if (!config) return { status: "not_configured" as const };

  const response = await fetch("https://slack.com/api/chat.postMessage", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.token}`,
      "Content-Type": "application/json; charset=utf-8",
    },
    body: JSON.stringify({
      channel: config.destinationId,
      ...buildSignupAlertMessage(alert, config.notifyUserId),
      unfurl_links: false,
      unfurl_media: false,
    }),
    signal: AbortSignal.timeout(3000),
  });
  const result = (await response.json().catch(() => null)) as SlackResponse | null;
  if (!response.ok || result?.ok !== true) {
    throw new Error(`Slack signup alert failed: ${result?.error ?? response.status}.`);
  }

  return { status: "sent" as const, messageId: result.ts ?? null };
}
