"use client";

import {
  ArrowRight,
  Heart,
  MessageCircle,
  Pencil,
  Trash2,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { useFormState, useFormStatus } from "react-dom";

import { EmptyPanel } from "@/components/EmptyPanel";
import { SectionHeading } from "@/components/SectionHeading";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type {
  CommunityHome,
  CommunityMentionCandidate,
  CommunityPost,
  CommunityPostComment,
  CommunitySpace,
} from "@/lib/types";
import { cn } from "@/lib/utils";
import { createClient } from "@/utils/supabase/client";

import {
  createCommunityComment,
  deleteCommunityComment,
  deleteCommunityPost,
  toggleCommunityCommentLike,
  toggleCommunityPostLike,
  type CommunityActionState,
  updateCommunityComment,
  updateCommunityPost,
} from "./actions";
import { CommunityPostComposer } from "./community-post-composer";
import { MentionPicker } from "./mention-picker";
import {
  broadcastCommunityFeedChange,
  communityFeedBroadcastEvent,
  communityRealtimeRefreshDelayMs,
  getCommunityFeedChannelName,
} from "./realtime";

const initialActionState: CommunityActionState = {
  message: "",
  status: "idle",
};

const selectedSpaceStorageKey = "olea-community-selected-space";

function formatRelativeDate(value: string) {
  return new Intl.DateTimeFormat("en-CA", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function isEdited(createdAt: string, updatedAt: string) {
  return new Date(updatedAt).getTime() !== new Date(createdAt).getTime();
}

function authorAttribution({
  authorName,
  authorOrganizationName,
}: {
  authorName: string;
  authorOrganizationName: string;
}) {
  return `${authorName} · ${authorOrganizationName}`;
}

function getMentionCandidatesForSpace({
  candidates,
  space,
}: {
  candidates: CommunityMentionCandidate[];
  space: CommunitySpace | undefined;
}) {
  if (!space) return [];
  if (!space.allowedPlanIds.length) return candidates;

  return candidates.filter((candidate) =>
    candidate.planIds.some((planId) => space.allowedPlanIds.includes(planId)),
  );
}

type OptimisticLikeState = {
  count: number;
  liked: boolean;
};

function useSyncedOptimisticLike({
  count,
  liked,
  targetId,
}: OptimisticLikeState & {
  targetId: string;
}) {
  const [optimisticLike, setOptimisticLike] = useState<OptimisticLikeState>({
    count,
    liked,
  });
  const pendingLikeRef = useRef<
    (OptimisticLikeState & { targetId: string }) | null
  >(null);

  useEffect(() => {
    const nextLike = { count, liked };
    const pendingLike = pendingLikeRef.current;

    if (pendingLike?.targetId === targetId) {
      if (pendingLike.liked === liked) {
        pendingLikeRef.current = null;
        setOptimisticLike(nextLike);
      }

      return;
    }

    pendingLikeRef.current = null;
    setOptimisticLike(nextLike);
  }, [count, liked, targetId]);

  function setPendingOptimisticLike(nextLike: OptimisticLikeState) {
    pendingLikeRef.current = {
      ...nextLike,
      targetId,
    };
    setOptimisticLike(nextLike);
  }

  function clearPendingOptimisticLike(nextLike: OptimisticLikeState) {
    pendingLikeRef.current = null;
    setOptimisticLike(nextLike);
  }

  return {
    clearPendingOptimisticLike,
    optimisticLike,
    setPendingOptimisticLike,
  };
}

function ActionMessage({ state }: { state: CommunityActionState }) {
  if (!state.message) return null;

  return (
    <p
      role={state.status === "error" ? "alert" : "status"}
      className={cn(
        "text-sm font-medium",
        state.status === "error" ? "text-red-600" : "text-emerald-700",
      )}
    >
      {state.message}
    </p>
  );
}

function useCommunityRealtimeRefresh({
  communityId,
  postIds,
}: {
  communityId: string;
  postIds: string[];
}) {
  const router = useRouter();
  const postIdsKey = useMemo(() => postIds.join(","), [postIds]);
  const refreshTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    const subscribedPostIds = postIdsKey ? postIdsKey.split(",") : [];
    let isMounted = true;

    setIsConnected(false);

    function scheduleRefresh() {
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
      }

      refreshTimeoutRef.current = setTimeout(() => {
        router.refresh();
      }, communityRealtimeRefreshDelayMs);
    }

    const channel = supabase
      .channel(getCommunityFeedChannelName(communityId))
      .on("broadcast", { event: communityFeedBroadcastEvent }, scheduleRefresh)
      .on(
        "postgres_changes",
        {
          event: "*",
          filter: `community_id=eq.${communityId}`,
          schema: "public",
          table: "community_posts",
        },
        scheduleRefresh,
      );

    for (const postId of subscribedPostIds) {
      channel
        .on(
          "postgres_changes",
          {
            event: "*",
            filter: `post_id=eq.${postId}`,
            schema: "public",
            table: "community_comments",
          },
          scheduleRefresh,
        )
        .on(
          "postgres_changes",
          {
            event: "*",
            filter: `post_id=eq.${postId}`,
            schema: "public",
            table: "community_reactions",
          },
          scheduleRefresh,
        );
    }

    async function subscribeToCommunityChanges() {
      const { data } = await supabase.auth.getSession();

      if (data.session?.access_token) {
        supabase.realtime.setAuth(data.session.access_token);
      }

      channel.subscribe((status) => {
        if (!isMounted) return;
        setIsConnected(status === "SUBSCRIBED");
      });
    }

    void subscribeToCommunityChanges();

    return () => {
      isMounted = false;

      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
      }

      void supabase.removeChannel(channel);
    };
  }, [communityId, postIdsKey, router]);

  return isConnected;
}

function SaveButton({ label = "Save changes" }: { label?: string }) {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" size="sm" disabled={pending}>
      {pending ? "Checking..." : label}
    </Button>
  );
}

function LikeButton({
  communityId,
  post,
}: {
  communityId: string;
  post: CommunityPost;
}) {
  const router = useRouter();
  const [isSaving, setIsSaving] = useState(false);
  const {
    clearPendingOptimisticLike,
    optimisticLike,
    setPendingOptimisticLike,
  } = useSyncedOptimisticLike({
    count: post.likeCount,
    liked: post.likedByCurrentUser,
    targetId: post.id,
  });
  const [errorMessage, setErrorMessage] = useState("");

  function handleToggleLike() {
    if (isSaving) return;

    const previousLike = optimisticLike;
    const nextLiked = !previousLike.liked;

    setIsSaving(true);
    setErrorMessage("");
    setPendingOptimisticLike({
      count: Math.max(0, previousLike.count + (nextLiked ? 1 : -1)),
      liked: nextLiked,
    });

    void (async () => {
      const formData = new FormData();
      formData.set("postId", post.id);
      formData.set("intent", nextLiked ? "like" : "unlike");

      const result = await toggleCommunityPostLike(initialActionState, formData);

      if (result.status === "error") {
        clearPendingOptimisticLike(previousLike);
        setErrorMessage(result.message);
        return;
      }

      await broadcastCommunityFeedChange(communityId);
      router.refresh();
    })().finally(() => setIsSaving(false));
  }

  return (
    <div aria-busy={isSaving} className="inline-flex items-center gap-2">
      <Button
        type="button"
        variant="ghost"
        size="sm"
        disabled={isSaving}
        aria-label={optimisticLike.liked ? "Unlike post" : "Like post"}
        aria-pressed={optimisticLike.liked}
        onClick={handleToggleLike}
        className={cn(
          "px-2 text-slate-500 hover:text-olea-green",
          optimisticLike.liked && "text-olea-green",
        )}
      >
        <Heart
          className={cn("size-4", optimisticLike.liked && "fill-current")}
        />
        <span aria-label={`${optimisticLike.count} likes`}>
          {optimisticLike.count}
        </span>
      </Button>
      {errorMessage ? (
        <span role="alert" className="text-xs font-medium text-red-600">
          {errorMessage}
        </span>
      ) : null}
    </div>
  );
}

function DeletePostButton({
  communityId,
  postId,
}: {
  communityId: string;
  postId: string;
}) {
  const router = useRouter();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [state, formAction] = useFormState(
    deleteCommunityPost,
    initialActionState,
  );

  useEffect(() => {
    if (state.status !== "success") return;
    setIsDialogOpen(false);

    void broadcastCommunityFeedChange(communityId).finally(() => {
      router.refresh();
    });
  }, [communityId, router, state]);

  return (
    <>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => setIsDialogOpen(true)}
        className="px-2 text-red-600 hover:text-red-700"
      >
        <Trash2 className="size-4" />
        Delete post
      </Button>
      <DeleteConfirmationDialog
        action={formAction}
        confirmLabel="Yes, delete post"
        description="This post and its replies will be removed from the community space. This action cannot be undone."
        hiddenFieldName="postId"
        hiddenFieldValue={postId}
        isOpen={isDialogOpen}
        onCancel={() => setIsDialogOpen(false)}
        state={state}
        title="Delete post?"
      />
    </>
  );
}

function DeleteCommentButton({
  commentId,
  communityId,
}: {
  commentId: string;
  communityId: string;
}) {
  const router = useRouter();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [state, formAction] = useFormState(
    deleteCommunityComment,
    initialActionState,
  );

  useEffect(() => {
    if (state.status !== "success") return;
    setIsDialogOpen(false);

    void broadcastCommunityFeedChange(communityId).finally(() => {
      router.refresh();
    });
  }, [communityId, router, state]);

  return (
    <>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => setIsDialogOpen(true)}
        className="px-2 text-red-600 hover:text-red-700"
      >
        <Trash2 className="size-4" />
        Delete comment
      </Button>
      <DeleteConfirmationDialog
        action={formAction}
        confirmLabel="Yes, delete comment"
        description="This reply will be removed from the conversation. This action cannot be undone."
        hiddenFieldName="commentId"
        hiddenFieldValue={commentId}
        isOpen={isDialogOpen}
        onCancel={() => setIsDialogOpen(false)}
        state={state}
        title="Delete comment?"
      />
    </>
  );
}

function DeleteSubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();

  return (
    <Button
      type="submit"
      variant="destructive"
      size="sm"
      disabled={pending}
    >
      <Trash2 className="size-4" />
      {pending ? "Deleting..." : label}
    </Button>
  );
}

function DeleteConfirmationDialog({
  action,
  confirmLabel,
  description,
  hiddenFieldName,
  hiddenFieldValue,
  isOpen,
  onCancel,
  state,
  title,
}: {
  action: (payload: FormData) => void;
  confirmLabel: string;
  description: string;
  hiddenFieldName: string;
  hiddenFieldValue: string;
  isOpen: boolean;
  onCancel: () => void;
  state: CommunityActionState;
  title: string;
}) {
  const cancelButtonRef = useRef<HTMLButtonElement>(null);
  const titleId = `delete-confirmation-${hiddenFieldValue}-title`;
  const descriptionId = `delete-confirmation-${hiddenFieldValue}-description`;

  useEffect(() => {
    if (!isOpen) return;

    cancelButtonRef.current?.focus();

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onCancel();
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onCancel]);

  if (!isOpen) return null;

  return (
    <div
      aria-describedby={descriptionId}
      aria-labelledby={titleId}
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4"
      role="dialog"
    >
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
        <div className="flex items-start gap-3">
          <div className="rounded-full bg-red-50 p-2 text-red-700">
            <Trash2 className="size-5" />
          </div>
          <div>
            <h3 id={titleId} className="text-lg font-semibold text-slate-950">
              {title}
            </h3>
            <p
              id={descriptionId}
              className="mt-2 text-sm leading-6 text-slate-600"
            >
              {description}
            </p>
          </div>
        </div>
        <form action={action} className="mt-6 space-y-4">
          <input
            type="hidden"
            name={hiddenFieldName}
            value={hiddenFieldValue}
          />
          <ActionMessage state={state} />
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button
              ref={cancelButtonRef}
              type="button"
              variant="outline"
              onClick={onCancel}
            >
              Cancel
            </Button>
            <DeleteSubmitButton label={confirmLabel} />
          </div>
        </form>
      </div>
    </div>
  );
}

function PostEditForm({
  communityId,
  mentionCandidates,
  onCancel,
  post,
}: {
  communityId: string;
  mentionCandidates: CommunityMentionCandidate[];
  onCancel: () => void;
  post: CommunityPost;
}) {
  const router = useRouter();
  const [state, formAction] = useFormState(
    updateCommunityPost,
    initialActionState,
  );

  useEffect(() => {
    if (state.status !== "success") return;
    onCancel();
    void broadcastCommunityFeedChange(communityId).finally(() => {
      router.refresh();
    });
  }, [communityId, onCancel, router, state]);

  return (
    <form action={formAction} className="mt-4 space-y-3 rounded-lg bg-slate-50 p-3">
      <input type="hidden" name="postId" value={post.id} />
      <Input
        aria-label="Edit post title"
        name="title"
        minLength={3}
        maxLength={180}
        required
        defaultValue={post.title}
      />
      <Textarea
        aria-label="Edit post body"
        name="body"
        minLength={10}
        maxLength={12000}
        required
        defaultValue={post.body}
        className="min-h-[120px] bg-white"
      />
      <Input
        aria-label="Edit resource link"
        name="resourceUrl"
        type="url"
        defaultValue={post.resourceUrl ?? ""}
        placeholder="https://example.org/resource"
      />
      <MentionPicker
        candidates={mentionCandidates}
        defaultSelectedUserIds={post.mentionedUserIds}
      />
      <div className="flex flex-wrap items-center gap-2">
        <SaveButton />
        <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
          <X className="size-4" />
          Cancel
        </Button>
        <ActionMessage state={state} />
      </div>
    </form>
  );
}

function CommentForm({
  communityId,
  mentionCandidates,
  postId,
}: {
  communityId: string;
  mentionCandidates: CommunityMentionCandidate[];
  postId: string;
}) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [mentionResetKey, setMentionResetKey] = useState(0);
  const [state, formAction] = useFormState(
    createCommunityComment,
    initialActionState,
  );

  useEffect(() => {
    if (state.status !== "success") return;
    formRef.current?.reset();
    setMentionResetKey((current) => current + 1);
    void broadcastCommunityFeedChange(communityId).finally(() => {
      router.refresh();
    });
  }, [communityId, router, state]);

  return (
    <form ref={formRef} action={formAction} className="mt-4 space-y-2">
      <input type="hidden" name="postId" value={postId} />
      <Textarea
        name="body"
        minLength={2}
        maxLength={6000}
        required
        placeholder="Add a reply..."
        className="min-h-[84px] bg-white"
      />
      <MentionPicker
        key={mentionResetKey}
        candidates={mentionCandidates}
        description="Mention members who should be notified about this reply."
      />
      <div className="flex flex-wrap items-center gap-3">
        <CommentSubmitButton />
        {state.message ? (
          <p
            role={state.status === "error" ? "alert" : "status"}
            className={cn(
              "text-sm font-medium",
              state.status === "error" ? "text-red-600" : "text-emerald-700",
            )}
          >
            {state.message}
          </p>
        ) : null}
      </div>
    </form>
  );
}

function CommentSubmitButton() {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" size="sm" disabled={pending}>
      {pending ? "Checking..." : "Reply"}
    </Button>
  );
}

function CommentEditor({
  comment,
  communityId,
  mentionCandidates,
  onCancel,
}: {
  comment: CommunityPostComment;
  communityId: string;
  mentionCandidates: CommunityMentionCandidate[];
  onCancel: () => void;
}) {
  const router = useRouter();
  const [state, formAction] = useFormState(
    updateCommunityComment,
    initialActionState,
  );

  useEffect(() => {
    if (state.status !== "success") return;
    onCancel();
    void broadcastCommunityFeedChange(communityId).finally(() => {
      router.refresh();
    });
  }, [communityId, onCancel, router, state]);

  return (
    <form action={formAction} className="mt-2 space-y-2">
      <input type="hidden" name="commentId" value={comment.id} />
      <Textarea
        aria-label="Edit comment"
        name="body"
        minLength={2}
        maxLength={6000}
        required
        defaultValue={comment.body}
        className="min-h-[84px] bg-white"
      />
      <MentionPicker
        candidates={mentionCandidates}
        defaultSelectedUserIds={comment.mentionedUserIds}
        description="Mention members who should be notified about this reply."
      />
      <div className="flex flex-wrap items-center gap-2">
        <SaveButton label="Save comment" />
        <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
          <X className="size-4" />
          Cancel
        </Button>
        <ActionMessage state={state} />
      </div>
    </form>
  );
}

function CommentLikeButton({
  comment,
  communityId,
}: {
  comment: CommunityPostComment;
  communityId: string;
}) {
  const router = useRouter();
  const [isSaving, setIsSaving] = useState(false);
  const {
    clearPendingOptimisticLike,
    optimisticLike,
    setPendingOptimisticLike,
  } = useSyncedOptimisticLike({
    count: comment.likeCount,
    liked: comment.likedByCurrentUser,
    targetId: comment.id,
  });
  const [errorMessage, setErrorMessage] = useState("");

  function handleToggleLike() {
    if (isSaving) return;

    const previousLike = optimisticLike;
    const nextLiked = !previousLike.liked;

    setIsSaving(true);
    setErrorMessage("");
    setPendingOptimisticLike({
      count: Math.max(0, previousLike.count + (nextLiked ? 1 : -1)),
      liked: nextLiked,
    });

    void (async () => {
      const formData = new FormData();
      formData.set("commentId", comment.id);
      formData.set("intent", nextLiked ? "like" : "unlike");

      const result = await toggleCommunityCommentLike(
        initialActionState,
        formData,
      );

      if (result.status === "error") {
        clearPendingOptimisticLike(previousLike);
        setErrorMessage(result.message);
        return;
      }

      await broadcastCommunityFeedChange(communityId);
      router.refresh();
    })().finally(() => setIsSaving(false));
  }

  return (
    <div aria-busy={isSaving} className="inline-flex items-center gap-2">
      <Button
        type="button"
        variant="ghost"
        size="sm"
        disabled={isSaving}
        aria-label={optimisticLike.liked ? "Unlike comment" : "Like comment"}
        aria-pressed={optimisticLike.liked}
        onClick={handleToggleLike}
        className={cn(
          "px-2 text-slate-500 hover:text-olea-green",
          optimisticLike.liked && "text-olea-green",
        )}
      >
        <Heart
          className={cn("size-4", optimisticLike.liked && "fill-current")}
        />
        <span aria-label={`${optimisticLike.count} comment likes`}>
          {optimisticLike.count}
        </span>
      </Button>
      {errorMessage ? (
        <span role="alert" className="text-xs font-medium text-red-600">
          {errorMessage}
        </span>
      ) : null}
    </div>
  );
}

function CommentItem({
  comment,
  communityId,
  currentUserId,
  mentionCandidates,
}: {
  comment: CommunityPostComment;
  communityId: string;
  currentUserId: string;
  mentionCandidates: CommunityMentionCandidate[];
}) {
  const [isEditing, setIsEditing] = useState(false);
  const canEdit = comment.authorUserId === currentUserId;
  const authorLabel = authorAttribution(comment);

  return (
    <div
      role="group"
      aria-label={`Comment: ${comment.body}`}
      className="text-sm"
    >
      <p
        aria-label={`Comment author ${authorLabel}`}
        className="font-semibold text-slate-700"
      >
        {authorLabel}
        <span className="ml-2 font-normal text-slate-400">
          {formatRelativeDate(comment.createdAt)}
        </span>
        {isEdited(comment.createdAt, comment.updatedAt) ? (
          <Badge variant="outline" className="ml-2">
            Edited
          </Badge>
        ) : null}
      </p>
      {isEditing ? (
        <CommentEditor
          comment={comment}
          communityId={communityId}
          mentionCandidates={mentionCandidates}
          onCancel={() => setIsEditing(false)}
        />
      ) : (
        <>
          <p className="mt-1 whitespace-pre-line leading-6 text-slate-600">
            {comment.body}
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <CommentLikeButton comment={comment} communityId={communityId} />
            {canEdit ? (
              <>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="px-2"
                onClick={() => setIsEditing(true)}
              >
                <Pencil className="size-4" />
                Edit comment
              </Button>
              <DeleteCommentButton
                commentId={comment.id}
                communityId={communityId}
              />
              </>
            ) : null}
          </div>
        </>
      )}
    </div>
  );
}

function PostCard({
  communityId,
  currentUserId,
  mentionCandidates,
  post,
}: {
  communityId: string;
  currentUserId: string;
  mentionCandidates: CommunityMentionCandidate[];
  post: CommunityPost;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const canEdit = post.authorUserId === currentUserId;
  const authorLabel = authorAttribution(post);

  return (
    <article
      aria-label={`Post: ${post.title}`}
      className="rounded-xl border border-slate-100 bg-white p-4 shadow-sm"
    >
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="outline" className="capitalize">
          {post.kind}
        </Badge>
        {post.pinnedAt ? (
          <Badge className="bg-olea-light text-olea-green hover:bg-olea-light">
            Pinned
          </Badge>
        ) : null}
        <span
          aria-label={`Post author ${authorLabel}`}
          className="text-xs text-slate-400"
        >
          {authorLabel} · {formatRelativeDate(post.createdAt)}
        </span>
        {isEdited(post.createdAt, post.updatedAt) ? (
          <Badge variant="outline">Edited</Badge>
        ) : null}
      </div>

      {isEditing ? (
        <PostEditForm
          communityId={communityId}
          mentionCandidates={mentionCandidates}
          post={post}
          onCancel={() => setIsEditing(false)}
        />
      ) : (
        <>
          <h3 className="mt-3 text-base font-semibold text-slate-900">
            {post.title}
          </h3>
          <p className="mt-2 whitespace-pre-line text-sm leading-6 text-slate-600">
            {post.body}
          </p>
          {post.resourceUrl ? (
            <a
              href={post.resourceUrl}
              target="_blank"
              rel="noreferrer"
              className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-olea-green"
            >
              Open resource
              <ArrowRight className="size-3.5" />
            </a>
          ) : null}
          {canEdit ? (
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="px-2"
                onClick={() => setIsEditing(true)}
              >
                <Pencil className="size-4" />
                Edit post
              </Button>
              <DeletePostButton communityId={communityId} postId={post.id} />
            </div>
          ) : null}
        </>
      )}

      <div className="mt-4 flex items-center gap-2 border-t border-slate-100 pt-3">
        <LikeButton communityId={communityId} post={post} />
        <span className="inline-flex items-center gap-1 px-2 text-sm font-medium text-slate-500">
          <MessageCircle className="size-4" />
          <span aria-label={`${post.comments.length} comments`}>
            {post.comments.length}
          </span>
        </span>
      </div>

      {post.comments.length ? (
        <div className="mt-4 space-y-3 rounded-lg bg-slate-50 p-3">
          {post.comments.map((comment) => (
            <CommentItem
              key={comment.id}
              comment={comment}
              communityId={communityId}
              currentUserId={currentUserId}
              mentionCandidates={mentionCandidates}
            />
          ))}
        </div>
      ) : null}

      <CommentForm
        communityId={communityId}
        mentionCandidates={mentionCandidates}
        postId={post.id}
      />
    </article>
  );
}

export function CommunityFeed({ community }: { community: CommunityHome }) {
  const [selectedSpaceId, setSelectedSpaceId] = useState(
    community.spaces[0]?.id ?? "",
  );
  const postIds = useMemo(
    () => community.posts.map((post) => post.id),
    [community.posts],
  );
  const selectedSpace = community.spaces.find(
    (space) => space.id === selectedSpaceId,
  );
  const mentionCandidates = getMentionCandidatesForSpace({
    candidates: community.mentionCandidates,
    space: selectedSpace,
  });
  const posts = useMemo(
    () => community.posts.filter((post) => post.spaceId === selectedSpaceId),
    [community.posts, selectedSpaceId],
  );

  const isRealtimeConnected = useCommunityRealtimeRefresh({
    communityId: community.id,
    postIds,
  });

  useEffect(() => {
    const savedSpaceId = window.sessionStorage.getItem(selectedSpaceStorageKey);
    if (
      savedSpaceId &&
      community.spaces.some((space) => space.id === savedSpaceId)
    ) {
      setSelectedSpaceId(savedSpaceId);
    }
  }, [community.spaces]);

  function handleSelectSpace(spaceId: string) {
    setSelectedSpaceId(spaceId);
    window.sessionStorage.setItem(selectedSpaceStorageKey, spaceId);
  }

  return (
    <div className="grid gap-0 lg:grid-cols-[280px_1fr]">
      <aside className="border-b bg-slate-50/70 p-4 lg:border-b-0 lg:border-r">
        <p className="px-2.5 pb-2 text-[11px] font-semibold uppercase tracking-[0.05em] text-slate-400">
          Spaces
        </p>
        <div className="lg:hidden">
          <Select value={selectedSpaceId} onValueChange={handleSelectSpace}>
            <SelectTrigger aria-label="Choose community space" className="h-11">
              <SelectValue placeholder="Choose a space" />
            </SelectTrigger>
            <SelectContent>
              {community.spaces.map((space) => (
                <SelectItem key={space.id} value={space.id}>
                  # {space.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {selectedSpace?.description ? (
            <p className="mt-2 px-1 text-xs leading-5 text-slate-500">
              {selectedSpace.description}
            </p>
          ) : null}
        </div>
        <div className="hidden space-y-1 lg:block">
          {community.spaces.map((space) => (
            <button
              key={space.id}
              type="button"
              onClick={() => handleSelectSpace(space.id)}
              className={cn(
                "w-full rounded-lg px-3 py-2.5 text-left text-sm text-slate-700 transition hover:bg-white hover:shadow-sm",
                selectedSpaceId === space.id &&
                  "bg-white text-olea-green shadow-sm ring-1 ring-olea-green/20",
              )}
            >
              <span className="font-semibold"># {space.name}</span>
              {space.description ? (
                <p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-500">
                  {space.description}
                </p>
              ) : null}
            </button>
          ))}
        </div>
      </aside>

      <div className="p-5 md:p-6">
        <span className="sr-only" aria-live="polite">
          {isRealtimeConnected
            ? "Community live updates connected"
            : "Connecting community live updates"}
        </span>
        <div className="mb-5 space-y-4">
          <SectionHeading>
            {selectedSpace ? `# ${selectedSpace.name}` : "Featured conversations"}
          </SectionHeading>
          <CommunityPostComposer
            communityId={community.id}
            mentionCandidates={mentionCandidates}
            selectedSpaceId={selectedSpaceId}
            selectedSpaceName={selectedSpace?.name ?? "Community"}
          />
        </div>

        {posts.length ? (
          <div className="space-y-3">
            {posts.map((post) => (
              <PostCard
                key={post.id}
                communityId={community.id}
                currentUserId={community.currentUserId}
                mentionCandidates={mentionCandidates}
                post={post}
              />
            ))}
          </div>
        ) : (
          <EmptyPanel
            title="Conversations are coming soon"
            description="Create the first post in this space to get the discussion started."
            icon={<MessageCircle className="size-5" />}
          />
        )}
      </div>
    </div>
  );
}
