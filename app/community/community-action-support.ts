import { requireMemberContext } from "@/lib/data/member-context";
import { logError } from "@/lib/observability/logger";
import type { CommunityPost } from "@/lib/types";
import { createAdminClient } from "@/utils/supabase/admin";
import { createClient } from "@/utils/supabase/server";

export type CreateCommunityPostState = {
  createdComment?: {
    authorName: string;
    authorOrganizationName: string;
    authorUserId: string;
    body: string;
    createdAt: string;
    id: string;
    mentionedUserIds: string[];
  };
  message: string;
  status: "error" | "idle" | "success";
};

export type CommunityActionState = CreateCommunityPostState;

const postKinds = ["discussion", "announcement", "resource"] as const;
const communityModerationProvider = "community_moderation";

export async function getRequiredMemberContext() {
  return requireMemberContext();
}

export async function getServerClient() {
  return createClient();
}

export function getText(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

export function getActionErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error) return error.message;
  if (!error || typeof error !== "object") return fallback;

  const maybeError = error as { message?: unknown };
  return typeof maybeError.message === "string" ? maybeError.message : fallback;
}

export async function queueCommunityModeration(
  target:
    | {
        postId: string;
        targetType: "post";
      }
    | {
        commentId: string;
        targetType: "comment";
      },
) {
  try {
    const admin = createAdminClient();
    const aggregateType =
      target.targetType === "post" ? "community_post" : "community_comment";
    const aggregateId =
      target.targetType === "post" ? target.postId : target.commentId;

    const { error } = await admin.from("integration_events").insert({
      aggregate_id: aggregateId,
      aggregate_type: aggregateType,
      event_type: `community.${target.targetType}.moderation_requested`,
      payload: target,
      provider: communityModerationProvider,
    });

    if (error) {
      logError("Unable to queue community moderation", error);
      return;
    }

    triggerCommunityModerationWorker();
  } catch (error) {
    logError("Unable to queue community moderation", error);
  }
}

export function validatePostInput(formData: FormData) {
  const body = getText(formData, "body");
  const kind = validateKind(getText(formData, "kind") || "discussion");
  const resourceUrl = normalizeResourceUrl(getText(formData, "resourceUrl"));
  const spaceId = getText(formData, "spaceId");
  const title = getText(formData, "title");

  validatePostText({ body, title });
  if (!spaceId) throw new Error("Choose a community space.");

  return { body, kind, resourceUrl, spaceId, title };
}

export function validateCommunityPostUpdateInput(formData: FormData) {
  const body = getText(formData, "body");
  const postId = validatePostId(formData);
  const resourceUrl = normalizeResourceUrl(getText(formData, "resourceUrl"));
  const title = getText(formData, "title");

  validatePostText({ body, title });
  return { body, postId, resourceUrl, title };
}

export function validateCommentInput(formData: FormData) {
  const body = getText(formData, "body");
  const postId = validatePostId(formData);

  validateCommentBody(body);
  return { body, postId };
}

export function validateCommentUpdateInput(formData: FormData) {
  const body = getText(formData, "body");
  const commentId = validateCommentId(formData);

  validateCommentBody(body);
  return { body, commentId };
}

export function validatePostId(formData: FormData) {
  const postId = getText(formData, "postId");
  if (!postId) throw new Error("Choose a post.");
  return postId;
}

export function validateCommentId(formData: FormData) {
  const commentId = getText(formData, "commentId");
  if (!commentId) throw new Error("Choose a comment.");
  return commentId;
}

function triggerCommunityModerationWorker() {
  if (process.env.COMMUNITY_MODERATION_DISABLE_AUTOMATIC_WORKER === "true") {
    return;
  }

  const secret = process.env.CRON_SECRET;
  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL ??
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null);

  if (!secret || !appUrl) return;

  try {
    void fetch(`${appUrl}/api/v1/community/moderation/process`, {
      cache: "no-store",
      headers: { authorization: `Bearer ${secret}` },
      method: "GET",
    }).catch((error) => {
      logError("Unable to trigger community moderation worker", error);
    });
  } catch (error) {
    logError("Unable to trigger community moderation worker", error);
  }
}

function normalizeResourceUrl(value: string) {
  if (!value) return null;

  try {
    const url = new URL(value);
    if (url.protocol !== "https:") {
      throw new Error("Only secure HTTPS resource links are supported.");
    }
    return url.toString();
  } catch {
    throw new Error("Enter a valid HTTPS resource link.");
  }
}

function validateKind(value: string): CommunityPost["kind"] {
  if (postKinds.includes(value as CommunityPost["kind"])) {
    return value as CommunityPost["kind"];
  }

  throw new Error("Choose a supported post type.");
}

function validatePostText({ body, title }: { body: string; title: string }) {
  if (title.length < 3 || title.length > 180) {
    throw new Error("Use a title between 3 and 180 characters.");
  }
  if (body.length < 10 || body.length > 12000) {
    throw new Error("Use a post body between 10 and 12,000 characters.");
  }
}

function validateCommentBody(body: string) {
  if (body.length < 2 || body.length > 6000) {
    throw new Error("Use a comment between 2 and 6,000 characters.");
  }
}
