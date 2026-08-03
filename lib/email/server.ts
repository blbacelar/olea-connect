import "server-only";

import { Resend } from "resend";

import { resolveEmailRecipient } from "@/lib/email/config";

let client: Resend | undefined;

export function getResend() {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) throw new Error("RESEND_API_KEY is not configured.");
  client ??= new Resend(apiKey);
  return client;
}

export function getEmailSender() {
  return (
    process.env.EMAIL_FROM ??
    "Olea Connects™ <notifications@olivesocialimpact.com>"
  );
}

export function getReplyTo() {
  return process.env.EMAIL_REPLY_TO ?? "hello@olivesocialimpact.com";
}

export function getAppUrl() {
  const vercelHost =
    process.env.VERCEL_URL ?? process.env.VERCEL_PROJECT_PRODUCTION_URL;

  return (
    process.env.NEXT_PUBLIC_APP_URL ??
    (vercelHost ? `https://${vercelHost}` : undefined) ??
    "http://localhost:3001"
  );
}

export function getEmailRecipient(original: string) {
  return resolveEmailRecipient(original);
}
