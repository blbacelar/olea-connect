import {
  getAppUrl,
} from "@/lib/email/server";
import {
  boardRecruitmentSurveyInvitationEmail,
  eventScheduleChangeEmail,
  referralApplicationApprovedEmail,
  referralApplicationReceivedEmail,
  referralApplicationRejectedEmail,
  referralApplicationSubmittedEmail,
  teamInvitationEmail,
  type TransactionalEmail,
} from "@/lib/email/templates";
import { createAdminClient } from "@/utils/supabase/admin";

type QueuedEmailEvent = {
  event_type: string;
  payload: unknown;
};

type BuiltEmail = Promise<{ email: TransactionalEmail; recipientEmail: string }>;

async function buildInvitationEmail(
  supabase: ReturnType<typeof createAdminClient>,
  event: QueuedEmailEvent,
): BuiltEmail {
  const payload = event.payload as {
    email: string;
    role: string;
    expires_at: string;
    accept_path: string;
    organization_id: string;
  };
  const { data: organization, error: organizationError } = await supabase
    .from("organizations")
    .select("name")
    .eq("id", payload.organization_id)
    .single();
  if (organizationError) throw organizationError;

  return {
    recipientEmail: payload.email,
    email: teamInvitationEmail({
      organizationName: organization.name,
      role: payload.role,
      expiresAt: payload.expires_at,
      acceptUrl: new URL(payload.accept_path, getAppUrl()).toString(),
    }),
  };
}

function buildEventScheduleChangeEmail(event: QueuedEmailEvent) {
  const payload = event.payload as {
    event_title: string;
    starts_at: string;
    timezone: string;
    recipient_email: string;
  };

  return {
    recipientEmail: payload.recipient_email,
    email: eventScheduleChangeEmail({
      eventTitle: payload.event_title,
      startsAt: payload.starts_at,
      timezone: payload.timezone,
      type: event.event_type as "event.canceled" | "event.rescheduled",
      webinarsUrl: new URL("/webinars", getAppUrl()).toString(),
    }),
  };
}

function buildBoardRecruitmentSurveyEmail(event: QueuedEmailEvent) {
  const payload = event.payload as {
    recipient_email: string;
    organization_name: string;
    member_name: string;
    survey_year: number;
    invitation_path: string;
    expires_at: string;
  };

  return {
    recipientEmail: payload.recipient_email,
    email: boardRecruitmentSurveyInvitationEmail({
      organizationName: payload.organization_name,
      memberName: payload.member_name,
      surveyYear: payload.survey_year,
      surveyUrl: new URL(payload.invitation_path, getAppUrl()).toString(),
      expiresAt: payload.expires_at,
    }),
  };
}

function buildReferralSubmittedEmail(event: QueuedEmailEvent) {
  const payload = event.payload as {
    recipient_email: string;
    full_name: string;
  };

  return {
    recipientEmail: payload.recipient_email,
    email: referralApplicationSubmittedEmail({
      fullName: payload.full_name,
      dashboardUrl: new URL("/referrals/dashboard", getAppUrl()).toString(),
    }),
  };
}

function buildReferralReceivedEmail(event: QueuedEmailEvent) {
  const payload = event.payload as {
    recipient_email: string;
    full_name: string;
    email: string;
    organization_name?: string | null;
  };

  return {
    recipientEmail: payload.recipient_email,
    email: referralApplicationReceivedEmail({
      fullName: payload.full_name,
      email: payload.email,
      organizationName: payload.organization_name ?? null,
      adminUrl: new URL("/settings/referrals", getAppUrl()).toString(),
    }),
  };
}

function buildReferralApprovedEmail(event: QueuedEmailEvent) {
  const payload = event.payload as {
    recipient_email: string;
    full_name: string;
    referral_path: string;
  };

  return {
    recipientEmail: payload.recipient_email,
    email: referralApplicationApprovedEmail({
      fullName: payload.full_name,
      referralUrl: new URL(payload.referral_path, getAppUrl()).toString(),
      dashboardUrl: new URL("/referrals/dashboard", getAppUrl()).toString(),
    }),
  };
}

function buildReferralRejectedEmail(event: QueuedEmailEvent) {
  const payload = event.payload as {
    recipient_email: string;
    full_name: string;
    reason?: string | null;
  };

  return {
    recipientEmail: payload.recipient_email,
    email: referralApplicationRejectedEmail({
      fullName: payload.full_name,
      reason: payload.reason ?? null,
      contactEmail: process.env.EMAIL_REPLY_TO ?? "hello@olivesocialimpact.com",
    }),
  };
}

export async function buildEmail(
  supabase: ReturnType<typeof createAdminClient>,
  event: QueuedEmailEvent,
): BuiltEmail {
  switch (event.event_type) {
    case "organization.invitation.created":
      return buildInvitationEmail(supabase, event);
    case "event.canceled":
    case "event.rescheduled":
      return buildEventScheduleChangeEmail(event);
    case "board_recruitment.survey_invitation":
      return buildBoardRecruitmentSurveyEmail(event);
    case "referral.application.submitted":
      return buildReferralSubmittedEmail(event);
    case "referral.application.received":
      return buildReferralReceivedEmail(event);
    case "referral.application.approved":
      return buildReferralApprovedEmail(event);
    case "referral.application.rejected":
      return buildReferralRejectedEmail(event);
    default:
      throw new Error(`Unsupported email event: ${event.event_type}`);
  }
}
