"use client";

import { MessageSquarePlus, ShieldCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useFormState, useFormStatus } from "react-dom";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { CommunitySpace } from "@/lib/types";
import { cn } from "@/lib/utils";

import {
  createCommunityPost,
  type CreateCommunityPostState,
} from "./actions";

const initialState: CreateCommunityPostState = {
  message: "",
  status: "idle",
};

const feedbackStorageKey = "olea-community-post-feedback";

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Checking post..." : "Publish post"}
    </Button>
  );
}

export function CommunityPostComposer({
  selectedSpaceId,
  spaces,
}: {
  selectedSpaceId: string;
  spaces: CommunitySpace[];
}) {
  const defaultSpaceId = selectedSpaceId || spaces[0]?.id || "";
  const router = useRouter();
  const [feedback, setFeedback] = useState(initialState);
  const [isOpen, setIsOpen] = useState(false);
  const [kind, setKind] = useState("discussion");
  const [spaceId, setSpaceId] = useState(defaultSpaceId);
  const [state, formAction] = useFormState(createCommunityPost, initialState);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    const savedFeedback = window.sessionStorage.getItem(feedbackStorageKey);
    if (!savedFeedback) return;

    try {
      setFeedback(JSON.parse(savedFeedback) as CreateCommunityPostState);
    } catch {
      window.sessionStorage.removeItem(feedbackStorageKey);
      return;
    }

    window.sessionStorage.removeItem(feedbackStorageKey);
  }, []);

  useEffect(() => {
    if (state.status === "idle") return;

    setFeedback(state);

    if (state.status === "success") {
      window.sessionStorage.setItem(feedbackStorageKey, JSON.stringify(state));
      formRef.current?.reset();
      setKind("discussion");
      setSpaceId(defaultSpaceId);
      setIsOpen(false);
      router.refresh();
    }
  }, [defaultSpaceId, router, state]);

  useEffect(() => {
    setSpaceId(defaultSpaceId);
  }, [defaultSpaceId]);

  if (!spaces.length) {
    return (
      <Button disabled variant="outline" size="sm">
        Create post
      </Button>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button
          type="button"
          variant={isOpen ? "secondary" : "outline"}
          size="sm"
          onClick={() => setIsOpen((current) => !current)}
        >
          <MessageSquarePlus className="size-4" />
          {isOpen ? "Close composer" : "Create post"}
        </Button>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-olea-light px-3 py-1 text-xs font-semibold text-olea-green">
          <ShieldCheck className="size-3.5" />
          AI moderated before publishing
        </span>
      </div>

      {feedback.message ? (
        <p
          role={feedback.status === "error" ? "alert" : "status"}
          className={cn(
            "rounded-lg px-3 py-2 text-sm font-medium",
            feedback.status === "success"
              ? "bg-emerald-50 text-emerald-700"
              : "bg-red-50 text-red-700",
          )}
        >
          {feedback.message}
        </p>
      ) : null}

      {isOpen ? (
        <form
          ref={formRef}
          action={formAction}
          className="rounded-xl border border-slate-200 bg-slate-50/70 p-4"
        >
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="community-space">Space</Label>
              <Select
                name="spaceId"
                value={spaceId}
                onValueChange={setSpaceId}
                required
              >
                <SelectTrigger id="community-space">
                  <SelectValue placeholder="Choose a space" />
                </SelectTrigger>
                <SelectContent>
                  {spaces.map((space) => (
                    <SelectItem key={space.id} value={space.id}>
                      {space.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="community-kind">Post type</Label>
              <Select name="kind" value={kind} onValueChange={setKind}>
                <SelectTrigger id="community-kind">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="discussion">Discussion</SelectItem>
                  <SelectItem value="announcement">Announcement</SelectItem>
                  <SelectItem value="resource">Resource</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="mt-4 space-y-2">
            <Label htmlFor="community-title">Title</Label>
            <Input
              id="community-title"
              name="title"
              minLength={3}
              maxLength={180}
              required
              placeholder="Ask a question or share a useful update"
            />
          </div>

          <div className="mt-4 space-y-2">
            <Label htmlFor="community-body">Post</Label>
            <Textarea
              id="community-body"
              name="body"
              minLength={10}
              maxLength={12000}
              required
              placeholder="Keep it kind, practical, and useful for other nonprofit leaders."
              className="min-h-[150px]"
            />
          </div>

          <div className="mt-4 space-y-2">
            <Label htmlFor="community-resource">Resource link optional</Label>
            <Input
              id="community-resource"
              name="resourceUrl"
              type="url"
              placeholder="https://example.org/resource"
            />
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-3">
            <SubmitButton />
            <p className="text-xs leading-5 text-slate-500">
              Posts are checked for harmful or disrespectful content before they
              appear in the community.
            </p>
          </div>

        </form>
      ) : null}
    </div>
  );
}
