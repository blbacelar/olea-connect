import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";

import type { MembershipTier, OrganizationRole } from "@/lib/types";

export interface CircleSsoPayload {
  email: string;
  name: string;
  external_id: string;
  organization_id: string;
  organization_name: string;
  organization_role: OrganizationRole;
  member_tag: MembershipTier;
  iat: number;
  exp: number;
}

export interface CircleSsoClaimsInput {
  email: string;
  name: string;
  externalId: string;
  organizationId: string;
  organizationName: string;
  organizationRole: OrganizationRole;
  tier: MembershipTier;
}

const DEFAULT_TTL_SECONDS = 5 * 60;

function base64UrlEncode(value: string) {
  return Buffer.from(value, "utf8").toString("base64url");
}

function base64UrlDecode(value: string) {
  return Buffer.from(value, "base64url").toString("utf8");
}

function sign(encodedPayload: string, secret: string) {
  return createHmac("sha256", secret).update(encodedPayload).digest("hex");
}

function signaturesMatch(actual: string, expected: string) {
  const actualBuffer = Buffer.from(actual, "hex");
  const expectedBuffer = Buffer.from(expected, "hex");

  return (
    actualBuffer.length === expectedBuffer.length &&
    timingSafeEqual(actualBuffer, expectedBuffer)
  );
}

export function createCircleSsoToken(
  claims: CircleSsoClaimsInput,
  secret: string,
  {
    now = new Date(),
    ttlSeconds = DEFAULT_TTL_SECONDS,
  }: { now?: Date; ttlSeconds?: number } = {},
) {
  const issuedAt = Math.floor(now.getTime() / 1000);
  const payload: CircleSsoPayload = {
    email: claims.email,
    name: claims.name,
    external_id: claims.externalId,
    organization_id: claims.organizationId,
    organization_name: claims.organizationName,
    organization_role: claims.organizationRole,
    member_tag: claims.tier,
    iat: issuedAt,
    exp: issuedAt + ttlSeconds,
  };
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));

  return `${encodedPayload}.${sign(encodedPayload, secret)}`;
}

export function verifyCircleSsoToken(
  token: string,
  secret: string,
  {
    expectedExternalId,
    now = new Date(),
  }: { expectedExternalId?: string; now?: Date } = {},
) {
  const [encodedPayload, signature] = token.split(".");

  if (!encodedPayload || !signature || token.split(".").length !== 2) {
    throw new Error("Invalid Circle SSO token format.");
  }

  const expectedSignature = sign(encodedPayload, secret);
  if (!signaturesMatch(signature, expectedSignature)) {
    throw new Error("Invalid Circle SSO token signature.");
  }

  const payload = JSON.parse(base64UrlDecode(encodedPayload)) as CircleSsoPayload;
  if (payload.exp <= Math.floor(now.getTime() / 1000)) {
    throw new Error("Circle SSO token has expired.");
  }

  if (expectedExternalId && payload.external_id !== expectedExternalId) {
    throw new Error("Circle SSO token subject mismatch.");
  }

  return payload;
}

export function buildCircleSsoUrl(communityUrl: string, token: string) {
  const url = new URL("/sso", communityUrl);
  url.searchParams.set("jwt_token", token);
  return url;
}
