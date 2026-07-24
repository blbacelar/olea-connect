"use client";

import { ArrowLeft, CalendarPlus, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";

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

import { createWebinarEvent } from "../actions";

const eventTypeOptions = [
  ["webinar", "Webinar"],
  ["speaker_session", "Speaker session"],
  ["funder_ama", "Funder AMA"],
  ["networking", "Networking event"],
  ["workshop", "Workshop"],
  ["summit", "Summit session"],
] as const;

const planOptions = [
  ["seedling", "Seedling"],
  ["roots", "Roots"],
  ["canopy", "Canopy"],
  ["harvest", "Harvest"],
] as const;

function toLocalDateTimeInput(date: Date) {
  const offsetDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return offsetDate.toISOString().slice(0, 16);
}

export function WebinarCreateForm() {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [type, setType] = useState("webinar");
  const [status, setStatus] = useState("scheduled");
  const [accessMode, setAccessMode] = useState("included");
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();
  const defaultStart = toLocalDateTimeInput(
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  );
  const defaultEnd = toLocalDateTimeInput(
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000 + 60 * 60 * 1000),
  );

  const handleSubmit = (formData: FormData) => {
    setError("");

    const startsAt = String(formData.get("startsAt") ?? "");
    const endsAt = String(formData.get("endsAt") ?? "");
    if (startsAt) formData.set("startsAtIso", new Date(startsAt).toISOString());
    if (endsAt) formData.set("endsAtIso", new Date(endsAt).toISOString());
    formData.set("type", type);
    formData.set("status", status);
    formData.set("accessMode", accessMode);

    startTransition(async () => {
      try {
        const result = await createWebinarEvent(formData);
        if ("error" in result && result.error) {
          setError(result.error);
          return;
        }
        formRef.current?.reset();
        router.push(`/webinars/${result.slug}`);
      } catch (createError) {
        setError(
          createError instanceof Error
            ? createError.message
            : "We could not create this webinar. Please review the details.",
        );
      }
    });
  };

  return (
    <form
      ref={formRef}
      action={handleSubmit}
      className="rounded-[14px] border bg-white p-6 shadow-soft"
    >
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-5">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-olea-green">
            Event setup
          </p>
          <h2 className="mt-1 text-xl font-semibold text-slate-900">
            Create a Zoom webinar
          </h2>
        </div>
        <Button asChild variant="outline">
          <Link href="/webinars">
            <ArrowLeft className="size-4" />
            Back to webinars
          </Link>
        </Button>
      </div>

      <div className="mt-6 grid gap-5 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="title">Title</Label>
          <Input
            id="title"
            name="title"
            placeholder="Board Governance Basics"
            required
          />
        </div>
        <div className="space-y-2">
          <Label>Event type</Label>
          <Select value={type} onValueChange={setType}>
            <SelectTrigger aria-label="Event type">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {eventTypeOptions.map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="summary">Summary</Label>
          <Textarea
            id="summary"
            name="summary"
            placeholder="A practical session for nonprofit leaders."
            required
          />
        </div>
        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description"
            name="description"
            placeholder="Optional details, agenda, speakers, or preparation notes."
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="startsAt">Start date and time</Label>
          <Input
            id="startsAt"
            name="startsAt"
            type="datetime-local"
            defaultValue={defaultStart}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="endsAt">End date and time</Label>
          <Input
            id="endsAt"
            name="endsAt"
            type="datetime-local"
            defaultValue={defaultEnd}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="timezone">Timezone label</Label>
          <Input
            id="timezone"
            name="timezone"
            defaultValue="America/Vancouver"
            required
          />
          <p className="text-xs leading-5 text-slate-400">
            Date fields are converted from your browser timezone before saving.
          </p>
        </div>
        <div className="space-y-2">
          <Label>Status</Label>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger aria-label="Status">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="scheduled">Scheduled</SelectItem>
              <SelectItem value="live">Live</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="joinUrl">Zoom URL</Label>
          <Input
            id="joinUrl"
            name="joinUrl"
            placeholder="https://zoom.us/j/123456789"
            required
            type="url"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="providerEventId">Zoom event ID</Label>
          <Input
            id="providerEventId"
            name="providerEventId"
            placeholder="Optional Zoom webinar or meeting ID"
          />
        </div>
      </div>

      <div className="mt-7 rounded-xl border bg-slate-50 p-5">
        <div className="grid gap-5 md:grid-cols-[1fr_1fr]">
          <div>
            <Label>Plan access</Label>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {planOptions.map(([value, label]) => (
                <label
                  key={value}
                  className="flex items-center gap-2 rounded-lg border bg-white px-3 py-2 text-sm font-semibold text-slate-700"
                >
                  <input
                    defaultChecked={value !== "seedling"}
                    name="planIds"
                    type="checkbox"
                    value={value}
                    className="size-4 accent-olea-green"
                  />
                  {label}
                </label>
              ))}
            </div>
          </div>
          <div className="space-y-3">
            <div className="space-y-2">
              <Label>Access rule</Label>
              <Select value={accessMode} onValueChange={setAccessMode}>
                <SelectTrigger aria-label="Access rule">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="included">Included with plan</SelectItem>
                  <SelectItem value="complimentary">
                    Complimentary tickets
                  </SelectItem>
                  <SelectItem value="paid">Paid ticket</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {accessMode === "complimentary" ? (
              <div className="space-y-2">
                <Label htmlFor="complimentaryTicketLimit">
                  Complimentary ticket limit
                </Label>
                <Input
                  id="complimentaryTicketLimit"
                  name="complimentaryTicketLimit"
                  min={1}
                  placeholder="1"
                  step={1}
                  type="number"
                />
              </div>
            ) : null}
            {accessMode === "paid" ? (
              <div className="space-y-2">
                <Label htmlFor="ticketPriceCents">Ticket price in cents</Label>
                <Input
                  id="ticketPriceCents"
                  name="ticketPriceCents"
                  min={1}
                  placeholder="2500"
                  step={1}
                  type="number"
                />
              </div>
            ) : null}
          </div>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <Button disabled={isPending} type="submit">
          {isPending ? (
            "Creating..."
          ) : (
            <>
              <CalendarPlus className="size-4" />
              Create webinar
            </>
          )}
        </Button>
        {error ? (
          <p role="alert" className="text-sm font-semibold text-red-600">
            {error}
          </p>
        ) : (
          <p className="inline-flex items-center gap-2 text-sm text-slate-500">
            <CheckCircle2 className="size-4 text-olea-green" />
            Members only see events their plan can access.
          </p>
        )}
      </div>
    </form>
  );
}
