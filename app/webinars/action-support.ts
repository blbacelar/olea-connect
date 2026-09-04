import { requireMemberContext } from "@/lib/data/member-context";
import { platformEventRoles } from "@/lib/data/webinars";
import type { MembershipTier } from "@/lib/types";
import { createAdminClient } from "@/utils/supabase/admin";
import { createClient } from "@/utils/supabase/server";

const activeSubscriptionStatuses = new Set(["active", "trialing"]);

export type WebinarActionState = {
  message: string;
  status: "error" | "idle" | "success";
};

export function getText(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

export function getActionErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error) return error.message;
  if (hasStringMessage(error)) return error.message;
  return fallback;
}

export async function requireEventAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError) throw userError;
  if (!user) throw new Error("Sign in before managing event operations.");

  const admin = createAdminClient();
  const { data: role, error } = await admin
    .from("platform_user_roles")
    .select("role")
    .eq("user_id", user.id)
    .in("role", [...platformEventRoles])
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  if (!role) throw new Error("Only platform event admins can manage events.");

  return { admin, userId: user.id };
}

export async function loadRegistrationContext(eventId: string) {
  const { member, organization } = await requireMemberContext();
  const supabase = await createClient();
  const results = await fetchRegistrationContextRows({
    eventId,
    organizationId: organization.id,
    planId: organization.tier,
    supabase,
    userId: member.id,
  });

  throwRegistrationContextErrors(results);
  assertRegistrationAllowed(results);

  const access = results.access.data;
  const event = results.event.data;
  if (!access) throw new Error("This event is not included with your plan.");
  if (!event) throw new Error("This event is not available.");

  return {
    access,
    event,
    existingRegistration: results.existingRegistration.data,
    member,
    organization,
    organizationRegistrationCount: results.organizationRegistrationCount.count ?? 0,
    registrationCount: results.registrationCount.count ?? 0,
    supabase,
  };
}

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

type FetchRegistrationContextRowsInput = {
  eventId: string;
  organizationId: string;
  planId: MembershipTier;
  supabase: SupabaseServerClient;
  userId: string;
};

function fetchRegistrationContextRows({
  eventId,
  organizationId,
  planId,
  supabase,
  userId,
}: FetchRegistrationContextRowsInput) {
  return Promise.all([
    fetchRegistrationSubscription(supabase, organizationId),
    fetchRegistrationEvent(supabase, eventId),
    fetchRegistrationAccess(supabase, eventId, planId),
    fetchEventRegistrationCount(supabase, eventId),
    fetchOrganizationRegistrationCount(supabase, eventId, organizationId),
    fetchExistingRegistration(supabase, eventId, userId),
  ]).then(
    ([
      subscription,
      event,
      access,
      registrationCount,
      organizationRegistrationCount,
      existingRegistration,
    ]) => ({
      access,
      event,
      existingRegistration,
      organizationRegistrationCount,
      registrationCount,
      subscription,
    }),
  );
}

type RegistrationContextRows = Awaited<
  ReturnType<typeof fetchRegistrationContextRows>
>;

function fetchRegistrationSubscription(
  supabase: SupabaseServerClient,
  organizationId: string,
) {
  return supabase
    .from("subscriptions")
    .select("status")
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
}

function fetchRegistrationEvent(supabase: SupabaseServerClient, eventId: string) {
  return supabase
    .from("events")
    .select("id, status, capacity, registration_opens_at, registration_closes_at")
    .eq("id", eventId)
    .single();
}

function fetchRegistrationAccess(
  supabase: SupabaseServerClient,
  eventId: string,
  planId: MembershipTier,
) {
  return supabase
    .from("event_plan_access")
    .select("included, complimentary_ticket_limit, ticket_price_cents")
    .eq("event_id", eventId)
    .eq("plan_id", planId)
    .maybeSingle();
}

function fetchEventRegistrationCount(
  supabase: SupabaseServerClient,
  eventId: string,
) {
  return supabase
    .from("event_registrations")
    .select("id", { count: "exact", head: true })
    .eq("event_id", eventId)
    .neq("status", "canceled");
}

function fetchOrganizationRegistrationCount(
  supabase: SupabaseServerClient,
  eventId: string,
  organizationId: string,
) {
  return supabase
    .from("event_registrations")
    .select("id", { count: "exact", head: true })
    .eq("event_id", eventId)
    .eq("organization_id", organizationId)
    .neq("status", "canceled");
}

function fetchExistingRegistration(
  supabase: SupabaseServerClient,
  eventId: string,
  userId: string,
) {
  return supabase
    .from("event_registrations")
    .select("id, status")
    .eq("event_id", eventId)
    .eq("user_id", userId)
    .maybeSingle();
}

function throwRegistrationContextErrors(results: RegistrationContextRows) {
  for (const result of Object.values(results)) {
    if (result.error) throw result.error;
  }
}

function assertRegistrationAllowed(results: RegistrationContextRows) {
  assertActiveSubscription(results.subscription.data?.status ?? "");
  if (!results.access.data) throw new Error("This event is not included with your plan.");
  if (!results.event.data) throw new Error("This event is not available.");

  assertRegistrableEventStatus(results.event.data.status);
  assertRegistrationWindow(results.event.data);

  if (requiresUnavailablePaidCheckout(results.access.data)) {
    throw new Error("Paid ticket checkout is not available yet.");
  }
}

function assertActiveSubscription(status: string) {
  if (!activeSubscriptionStatuses.has(status)) {
    throw new Error("An active membership is required to register for events.");
  }
}

function assertRegistrableEventStatus(status: string) {
  if (!["scheduled", "live", "rescheduled"].includes(status)) {
    throw new Error(
      "Registration is only available for scheduled, live, or rescheduled events.",
    );
  }
}

function assertRegistrationWindow(event: {
  registration_closes_at: string | null;
  registration_opens_at: string | null;
}) {
  const now = Date.now();
  if (event.registration_opens_at && new Date(event.registration_opens_at).getTime() > now) {
    throw new Error("Registration is not open yet.");
  }
  if (event.registration_closes_at && new Date(event.registration_closes_at).getTime() < now) {
    throw new Error("Registration has closed.");
  }
}

function requiresUnavailablePaidCheckout(access: {
  included: boolean;
  ticket_price_cents: number | null;
}) {
  return !access.included && access.ticket_price_cents && access.ticket_price_cents > 0;
}

function hasStringMessage(error: unknown): error is { message: string } {
  const candidate = error as { message?: unknown } | null;

  return (
    typeof candidate === "object" &&
    candidate !== null &&
    typeof candidate.message === "string"
  );
}
