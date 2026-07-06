"use server";

import { moderateCommunityPost } from "@/lib/community/moderation";
import { requireMemberContext } from "@/lib/data/member-context";
import type { CommunityPost } from "@/lib/types";
import { createClient } from "@/utils/supabase/server";

export type CreateCommunityPostState = {
  message: string;
  status: "error" | "idle" | "success";
};

const postKinds = ["discussion", "announcement", "resource"] as const;

function getText(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function validateKind(value: string): CommunityPost["kind"] {
  if (postKinds.includes(value as CommunityPost["kind"])) {
    return value as CommunityPost["kind"];
  }

  throw new Error("Choose a supported post type.");
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

function validatePostInput(formData: FormData) {
  const body = getText(formData, "body");
  const kind = validateKind(getText(formData, "kind") || "discussion");
  const resourceUrl = normalizeResourceUrl(getText(formData, "resourceUrl"));
  const spaceId = getText(formData, "spaceId");
  const title = getText(formData, "title");

  if (!spaceId) throw new Error("Choose a community space.");
  if (title.length < 3 || title.length > 180) {
    throw new Error("Use a title between 3 and 180 characters.");
  }
  if (body.length < 10 || body.length > 12000) {
    throw new Error("Use a post body between 10 and 12,000 characters.");
  }

  return {
    body,
    kind,
    resourceUrl,
    spaceId,
    title,
  };
}

export async function createCommunityPost(
  _previousState: CreateCommunityPostState,
  formData: FormData,
): Promise<CreateCommunityPostState> {
  try {
    const { member } = await requireMemberContext();
    const input = validatePostInput(formData);
    const supabase = await createClient();

    const { data: space, error: spaceError } = await supabase
      .from("community_spaces")
      .select("id, community_id")
      .eq("id", input.spaceId)
      .single();

    if (spaceError) throw spaceError;

    const moderation = await moderateCommunityPost({
      body: input.body,
      title: input.title,
    });

    if (!moderation.approved) {
      return {
        message:
          moderation.reason ??
          "Your post could not be shared. Please rewrite it in a respectful tone.",
        status: "error",
      };
    }

    const { error } = await supabase.from("community_posts").insert({
      author_user_id: member.id,
      body: input.body,
      community_id: space.community_id,
      kind: input.kind,
      resource_url: input.resourceUrl,
      space_id: space.id,
      status: "published",
      title: input.title,
    });

    if (error) throw error;

    return {
      message: "Your post is live in the community.",
      status: "success",
    };
  } catch (error) {
    return {
      message:
        error instanceof Error
          ? error.message
          : "We could not publish your post. Please try again.",
      status: "error",
    };
  }
}
