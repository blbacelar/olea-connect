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
import { Textarea } from "@/components/ui/textarea";
import type {
  CommunityHome,
  CommunityPost,
  CommunityPostComment,
} from "@/lib/types";
import { cn } from "@/lib/utils";

import {
  createCommunityComment,
  deleteCommunityComment,
  deleteCommunityPost,
  toggleCommunityPostLike,
  type CommunityActionState,
  updateCommunityComment,
  updateCommunityPost,
} from "./actions";
import { CommunityPostComposer } from "./community-post-composer";

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

function SaveButton({ label = "Save changes" }: { label?: string }) {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" size="sm" disabled={pending}>
      {pending ? "Checking..." : label}
    </Button>
  );
}

function LikeButton({ post }: { post: CommunityPost }) {
  const router = useRouter();
  const [state, formAction] = useFormState(
    toggleCommunityPostLike,
    initialActionState,
  );

  useEffect(() => {
    if (state.status === "success") router.refresh();
  }, [router, state]);

  return (
    <form action={formAction}>
      <input type="hidden" name="postId" value={post.id} />
      <input
        type="hidden"
        name="intent"
        value={post.likedByCurrentUser ? "unlike" : "like"}
      />
      <LikeSubmitButton post={post} />
    </form>
  );
}

function LikeSubmitButton({ post }: { post: CommunityPost }) {
  const { pending } = useFormStatus();

  return (
    <Button
      type="submit"
      variant="ghost"
      size="sm"
      disabled={pending}
      aria-label={post.likedByCurrentUser ? "Unlike post" : "Like post"}
      aria-pressed={post.likedByCurrentUser}
      className={cn(
        "px-2 text-slate-500 hover:text-olea-green",
        post.likedByCurrentUser && "text-olea-green",
      )}
    >
      <Heart
        className={cn("size-4", post.likedByCurrentUser && "fill-current")}
      />
      <span aria-label={`${post.likeCount} likes`}>{post.likeCount}</span>
    </Button>
  );
}

function DeletePostButton({ postId }: { postId: string }) {
  const router = useRouter();
  const [state, formAction] = useFormState(
    deleteCommunityPost,
    initialActionState,
  );

  useEffect(() => {
    if (state.status === "success") router.refresh();
  }, [router, state]);

  return (
    <form
      action={formAction}
      onSubmit={(event) => {
        if (!window.confirm("Delete this post? This cannot be undone.")) {
          event.preventDefault();
        }
      }}
      className="inline-flex items-center gap-2"
    >
      <input type="hidden" name="postId" value={postId} />
      <DeleteSubmitButton label="Delete post" />
      <ActionMessage state={state} />
    </form>
  );
}

function DeleteCommentButton({ commentId }: { commentId: string }) {
  const router = useRouter();
  const [state, formAction] = useFormState(
    deleteCommunityComment,
    initialActionState,
  );

  useEffect(() => {
    if (state.status === "success") router.refresh();
  }, [router, state]);

  return (
    <form
      action={formAction}
      onSubmit={(event) => {
        if (!window.confirm("Delete this comment? This cannot be undone.")) {
          event.preventDefault();
        }
      }}
      className="inline-flex items-center gap-2"
    >
      <input type="hidden" name="commentId" value={commentId} />
      <DeleteSubmitButton label="Delete comment" />
      <ActionMessage state={state} />
    </form>
  );
}

function DeleteSubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();

  return (
    <Button
      type="submit"
      variant="ghost"
      size="sm"
      disabled={pending}
      className="px-2 text-red-600 hover:text-red-700"
    >
      <Trash2 className="size-4" />
      {pending ? "Deleting..." : label}
    </Button>
  );
}

function PostEditForm({
  onCancel,
  post,
}: {
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
    router.refresh();
  }, [onCancel, router, state]);

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

function CommentForm({ postId }: { postId: string }) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [state, formAction] = useFormState(
    createCommunityComment,
    initialActionState,
  );

  useEffect(() => {
    if (state.status !== "success") return;
    formRef.current?.reset();
    router.refresh();
  }, [router, state]);

  return (
    <form ref={formRef} action={formAction} className="mt-4 space-y-2">
      <input type="hidden" name="postId" value={postId} />
      <Textarea
        name="body"
        minLength={2}
        maxLength={6000}
        required
        placeholder="Add a respectful reply..."
        className="min-h-[84px] bg-white"
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
  onCancel,
}: {
  comment: CommunityPostComment;
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
    router.refresh();
  }, [onCancel, router, state]);

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

function CommentItem({
  comment,
  currentUserId,
}: {
  comment: CommunityPostComment;
  currentUserId: string;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const canEdit = comment.authorUserId === currentUserId;

  return (
    <div
      role="group"
      aria-label={`Comment: ${comment.body}`}
      className="text-sm"
    >
      <p className="font-semibold text-slate-700">
        {canEdit ? "You" : "Member"}
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
        <CommentEditor comment={comment} onCancel={() => setIsEditing(false)} />
      ) : (
        <>
          <p className="mt-1 whitespace-pre-line leading-6 text-slate-600">
            {comment.body}
          </p>
          {canEdit ? (
            <div className="mt-2 flex flex-wrap items-center gap-2">
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
              <DeleteCommentButton commentId={comment.id} />
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}

function PostCard({
  currentUserId,
  post,
}: {
  currentUserId: string;
  post: CommunityPost;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const canEdit = post.authorUserId === currentUserId;

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
        <span className="text-xs text-slate-400">
          {post.authorUserId === currentUserId ? "You" : "Member"} ·{" "}
          {formatRelativeDate(post.createdAt)}
        </span>
        {isEdited(post.createdAt, post.updatedAt) ? (
          <Badge variant="outline">Edited</Badge>
        ) : null}
      </div>

      {isEditing ? (
        <PostEditForm post={post} onCancel={() => setIsEditing(false)} />
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
              <DeletePostButton postId={post.id} />
            </div>
          ) : null}
        </>
      )}

      <div className="mt-4 flex items-center gap-2 border-t border-slate-100 pt-3">
        <LikeButton post={post} />
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
              currentUserId={currentUserId}
            />
          ))}
        </div>
      ) : null}

      <CommentForm postId={post.id} />
    </article>
  );
}

export function CommunityFeed({ community }: { community: CommunityHome }) {
  const [selectedSpaceId, setSelectedSpaceId] = useState(
    community.spaces[0]?.id ?? "",
  );
  const selectedSpace = community.spaces.find(
    (space) => space.id === selectedSpaceId,
  );
  const posts = useMemo(
    () => community.posts.filter((post) => post.spaceId === selectedSpaceId),
    [community.posts, selectedSpaceId],
  );

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
        <div className="space-y-1">
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
        <div className="mb-5 space-y-4">
          <SectionHeading>
            {selectedSpace ? `# ${selectedSpace.name}` : "Featured conversations"}
          </SectionHeading>
          <CommunityPostComposer
            selectedSpaceId={selectedSpaceId}
            spaces={community.spaces}
          />
        </div>

        {posts.length ? (
          <div className="space-y-3">
            {posts.map((post) => (
              <PostCard
                key={post.id}
                currentUserId={community.currentUserId}
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
