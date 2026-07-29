import "server-only";

import type { MembershipTier } from "@/lib/types";

const TIER_ENV_KEYS: Record<MembershipTier, string> = {
  seedling: "CIRCLE_MEMBER_TAG_SEEDLING_ID",
  roots: "CIRCLE_MEMBER_TAG_ROOTS_ID",
  canopy: "CIRCLE_MEMBER_TAG_CANOPY_ID",
  harvest: "CIRCLE_MEMBER_TAG_HARVEST_ID",
};

const TIER_SPACE_ENV_KEYS: Record<MembershipTier, string> = {
  seedling: "CIRCLE_SPACE_GROUP_SEEDLING_IDS",
  roots: "CIRCLE_SPACE_GROUP_ROOTS_IDS",
  canopy: "CIRCLE_SPACE_GROUP_CANOPY_IDS",
  harvest: "CIRCLE_SPACE_GROUP_HARVEST_IDS",
};

export interface CircleConfig {
  apiBaseUrl: string;
  apiToken?: string;
  communityUrl: string;
  ssoSecret: string;
}

function requiredEnv(name: string) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is not configured.`);
  return value;
}

function parseIntegerList(value: string | undefined) {
  if (!value?.trim()) return [];

  return value
    .split(",")
    .map((item) => Number.parseInt(item.trim(), 10))
    .filter((item) => Number.isInteger(item) && item > 0);
}

export function getCircleConfig({
  requireApiToken = false,
}: { requireApiToken?: boolean } = {}): CircleConfig {
  const apiToken = process.env.CIRCLE_API_TOKEN?.trim();

  if (requireApiToken && !apiToken) {
    throw new Error("CIRCLE_API_TOKEN is not configured.");
  }

  return {
    apiBaseUrl:
      process.env.CIRCLE_API_BASE_URL?.trim().replace(/\/$/, "") ??
      "https://api-headless.circle.so",
    apiToken,
    communityUrl: requiredEnv("CIRCLE_COMMUNITY_URL").replace(/\/$/, ""),
    ssoSecret: requiredEnv("CIRCLE_SSO_SECRET"),
  };
}

export function getCircleMemberTagIds(tier: MembershipTier) {
  return parseIntegerList(process.env[TIER_ENV_KEYS[tier]]);
}

export function getCircleSpaceGroupIds(tier: MembershipTier) {
  return parseIntegerList(process.env[TIER_SPACE_ENV_KEYS[tier]]);
}
