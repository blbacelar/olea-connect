import { revalidatePath } from "next/cache";

import { eventTypes } from "@/lib/data/webinars";
import { normalizeHttpUrl, parseStrictInteger } from "@/lib/input-validation";
import type { MembershipTier, Webinar } from "@/lib/types";
import { createAdminClient } from "@/utils/supabase/admin";

import { getText, requireEventAdmin } from "./action-support";

const membershipTiers = ["seedling", "roots", "canopy", "harvest"] as const;
const creatableEventStatuses = ["scheduled", "live"] as const;
const accessModes = ["included", "complimentary", "paid"] as const;

export type CreateWebinarEventResult =
  | { error?: never; slug: Webinar["slug"] }
  | { error: string; slug?: never };

export async function createWebinarEventFromForm(formData: FormData) {
  const { admin, userId } = await requireEventAdmin();
  const eventValues = parseWebinarEventForm(formData, userId);
  const { data: event, error: eventError } = await admin
    .from("events")
    .insert(eventValues.event)
    .select("id, slug")
    .single();

  if (eventError) throw eventError;

  const accessError = await insertEventPlanAccess(
    admin,
    event.id,
    eventValues.access,
  );
  if (accessError) {
    await admin.from("events").delete().eq("id", event.id);
    throw accessError;
  }

  revalidatePath("/webinars");
  revalidatePath("/webinars/manage");
  return { slug: event.slug as Webinar["slug"] };
}

type ParsedWebinarEvent = {
  access: {
    accessMode: (typeof accessModes)[number];
    complimentaryLimit: number | null;
    planIds: MembershipTier[];
    ticketPriceCents: number | null;
  };
  event: {
    created_by: string;
    description: string | null;
    ends_at: string;
    join_url: string;
    meeting_provider: "zoom";
    provider_event_id: string | null;
    registration_closes_at: string;
    registration_opens_at: string;
    slug: string;
    starts_at: string;
    status: (typeof creatableEventStatuses)[number];
    summary: string;
    timezone: string;
    title: string;
    type: (typeof eventTypes)[number];
  };
};

function parseWebinarEventForm(
  formData: FormData,
  userId: string,
): ParsedWebinarEvent {
  const title = getText(formData, "title");
  const summary = getText(formData, "summary");
  const startsAt = parseIsoDate(
    getText(formData, "startsAtIso"),
    "Choose a valid start date and time.",
  );
  const endsAt = parseIsoDate(
    getText(formData, "endsAtIso"),
    "Choose a valid end date and time.",
  );

  assertCreateEventText(title, summary);
  assertChronologicalDates(startsAt, endsAt);

  return {
    access: parseEventAccess(formData),
    event: {
      created_by: userId,
      description: getText(formData, "description") || null,
      ends_at: endsAt.toISOString(),
      join_url: parseSecureJoinUrl(formData),
      meeting_provider: "zoom",
      provider_event_id: getText(formData, "providerEventId") || null,
      registration_closes_at: startsAt.toISOString(),
      registration_opens_at: new Date().toISOString(),
      slug: `${slugify(title)}-${Date.now().toString(36)}`,
      starts_at: startsAt.toISOString(),
      status: parseCreatableStatus(formData),
      summary,
      timezone: getText(formData, "timezone") || "America/Vancouver",
      title,
      type: parseEventType(formData),
    },
  };
}

function assertCreateEventText(title: string, summary: string) {
  if (title.length < 3) throw new Error("Enter a webinar title.");
  if (summary.length < 10) throw new Error("Enter a short webinar summary.");
}

function assertChronologicalDates(startsAt: Date, endsAt: Date) {
  if (endsAt <= startsAt) throw new Error("End time must be after start time.");
}

function parseEventType(formData: FormData) {
  const type = getText(formData, "type");
  assertOneOf(eventTypes, type, "Choose a supported event type.");
  return type;
}

function parseCreatableStatus(formData: FormData) {
  const status = getText(formData, "status") || "scheduled";
  assertOneOf(creatableEventStatuses, status, "Choose a supported event status.");
  return status;
}

function parseSecureJoinUrl(formData: FormData) {
  const joinUrl = normalizeHttpUrl(getText(formData, "joinUrl"), "Zoom URL");
  if (!joinUrl.startsWith("https://")) {
    throw new Error("Enter a secure Zoom URL that starts with https://.");
  }
  return joinUrl;
}

function parseEventAccess(formData: FormData): ParsedWebinarEvent["access"] {
  const accessMode = getText(formData, "accessMode") || "included";
  assertOneOf(accessModes, accessMode, "Choose a supported access rule.");

  return {
    accessMode,
    complimentaryLimit: parseComplimentaryTicketLimit(formData, accessMode),
    planIds: parsePlanIds(formData),
    ticketPriceCents: parseTicketPriceCents(formData, accessMode),
  };
}

function parsePlanIds(formData: FormData) {
  const selectedPlanIds = formData.getAll("planIds").map((value) => String(value));
  if (!selectedPlanIds.length) throw new Error("Choose at least one membership plan.");

  return selectedPlanIds.map((planId) => {
    assertOneOf(membershipTiers, planId, "Choose supported membership plans.");
    return planId;
  });
}

function parseComplimentaryTicketLimit(
  formData: FormData,
  accessMode: (typeof accessModes)[number],
) {
  return accessMode === "complimentary"
    ? parsePositiveInteger(
        getText(formData, "complimentaryTicketLimit"),
        "Enter a complimentary ticket limit greater than zero.",
      )
    : null;
}

function parseTicketPriceCents(
  formData: FormData,
  accessMode: (typeof accessModes)[number],
) {
  const value = getText(formData, "ticketPriceCents");
  return accessMode === "paid"
    ? parsePositiveInteger(value, "Enter a paid ticket amount in cents greater than zero.")
    : parseOptionalPositiveInteger(value, "Ticket amount must be greater than zero.");
}

async function insertEventPlanAccess(
  admin: ReturnType<typeof createAdminClient>,
  eventId: string,
  access: ParsedWebinarEvent["access"],
) {
  const { error } = await admin.from("event_plan_access").insert(
    access.planIds.map((planId) => ({
      complimentary_ticket_limit: access.complimentaryLimit,
      currency: "CAD",
      event_id: eventId,
      included: access.accessMode === "included",
      plan_id: planId,
      ticket_price_cents: access.ticketPriceCents,
    })),
  );
  return error;
}

function assertOneOf<T extends readonly string[]>(
  values: T,
  value: string,
  message: string,
): asserts value is T[number] {
  if (!values.includes(value)) throw new Error(message);
}

function parsePositiveInteger(value: string, message: string) {
  try {
    return parseStrictInteger(value, message, 1);
  } catch {
    throw new Error(message);
  }
}

function parseOptionalPositiveInteger(value: string, message: string) {
  if (!value) return null;
  return parsePositiveInteger(value, message);
}

function parseIsoDate(value: string, message: string) {
  const date = new Date(value);
  if (!value || Number.isNaN(date.getTime())) throw new Error(message);
  return date;
}

function slugify(value: string) {
  const slug = value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80)
    .replace(/^-+|-+$/g, "");

  return slug || "webinar";
}
