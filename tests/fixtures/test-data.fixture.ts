import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import type { EdReviewCampaignStatus } from "@/lib/ed-review/domain";

import { createTestIdentity } from "../factories/identity";
import { getTestSupabaseEnvironment } from "../support/test-environment";
import { test as base } from "./browser.fixture";
import * as communityMethods from "./test-data/community";
import * as consultingReviewMethods from "./test-data/consultingReview";
import * as eventMethods from "./test-data/events";
import * as invitationMethods from "./test-data/invitations";
import * as organizationMethods from "./test-data/organization";
import * as templateMethods from "./test-data/templates";

type CleanupTask = {
  label: string;
  run: () => Promise<void>;
};

export type CreatedOrganizationOwner = {
  marker: string;
  userId: string;
  organizationId: string;
  organizationName: string;
  subscriptionId: string | null;
  fullName: string;
  email: string;
  password: string;
};

export type CreatedOrganizationMember = {
  marker: string;
  userId: string;
  organizationId: string;
  fullName: string;
  email: string;
  password: string;
};

export type CreatedTeamInvitee = {
  marker: string;
  fullName: string;
  email: string;
  password: string;
};

export type TeamInvitationState = {
  id: string;
  rawToken: string;
  status: "pending" | "accepted" | "revoked" | "expired";
  acceptedBy: string | null;
};

export type CreatedEvent = {
  id: string;
  slug: string;
  title: string;
  startsAt: string;
};

export type CreatedNotification = {
  id: string;
  userId: string;
  title: string;
};

export type EdReviewCycleState = {
  status: EdReviewCampaignStatus;
  campaigns: Array<{
    status: EdReviewCampaignStatus;
    title: string;
  }>;
};

export type EdReviewReviewerAssignmentState = {
  id: string;
  role: "board_chair" | "hr_reviewer" | "privileged_auditor";
};

export type EventStatus =
  | "draft"
  | "scheduled"
  | "live"
  | "completed"
  | "canceled"
  | "archived"
  | "rescheduled";

export type PlatformRole =
  | "super_admin"
  | "content_admin"
  | "consultant"
  | "consulting_admin"
  | "grants_admin"
  | "community_admin"
  | "finance_admin";

export type ConsultingRequestLookup = {
  id: string;
  assigned_to: string | null;
  description: string;
  internal_notes: string | null;
  member_notes: string | null;
  status: string;
  title: string;
};

export type ConsultingActivityLookup = {
  event_type: string;
  message: string | null;
  new_status: string | null;
  old_status: string | null;
};

export type ConsultingTimeEntryLookup = {
  description: string;
  is_in_kind: boolean;
  minutes: number;
  work_date: string;
};

export type CreatedTemplateInstance = {
  id: string;
  organizationId: string;
  resourceId: string;
  title: string;
};

export type CreatedTemplateExport = {
  id: string;
  organizationId: string;
  resourceId: string;
  templateInstanceId: string;
};

export type CreatedTemplateExportDownload = {
  id: string;
  exportId: string;
  organizationId: string;
};

export type DefaultCommunity = {
  id: string;
};

export type CommunitySpace = {
  id: string;
  community_id: string;
};

export type MailpitMessage = {
  ID: string;
  To?: Array<{ Address?: string }>;
};

export type MailpitMessageDetails = {
  HTML?: string;
  Text?: string;
};

export class TestDataManager {
  readonly cleanupTasks: CleanupTask[] = [];
  identitySequence = 0;
  purged = false;

  constructor(
    readonly supabase: SupabaseClient,
    readonly testInfo: Parameters<typeof createTestIdentity>[0],
  ) {}

  registerCleanup(task: CleanupTask) {
    this.cleanupTasks.push(task);
  }

  async cleanupAuthUserDependencies(userId: string) {
    const { error: consultingAttachmentError } = await this.supabase
      .from("consulting_request_attachments")
      .delete()
      .eq("uploaded_by", userId);
    if (consultingAttachmentError) throw consultingAttachmentError;

    const { error: consultingTimeError } = await this.supabase
      .from("consulting_time_entries")
      .delete()
      .eq("user_id", userId);
    if (consultingTimeError) throw consultingTimeError;

    const { error: consultingAssignmentError } = await this.supabase
      .from("consulting_requests")
      .update({ assigned_to: null })
      .eq("assigned_to", userId);
    if (consultingAssignmentError) throw consultingAssignmentError;

    const { error: consultingRequestError } = await this.supabase
      .from("consulting_requests")
      .delete()
      .eq("requested_by", userId);
    if (consultingRequestError) throw consultingRequestError;

    const { error: notificationError } = await this.supabase
      .from("notifications")
      .delete()
      .eq("user_id", userId);
    if (notificationError) throw notificationError;

    const { error: profileError } = await this.supabase
      .from("profiles")
      .delete()
      .eq("id", userId);
    if (profileError) throw profileError;
  }

  createOrganizationOwner = organizationMethods.createOrganizationOwner;
  organizationExists = organizationMethods.organizationExists;
  getBrandProfile = organizationMethods.getBrandProfile;
  createOrganizationMember = organizationMethods.createOrganizationMember;
  createUnregisteredTeamInvitee = organizationMethods.createUnregisteredTeamInvitee;
  getTeamInvitation = invitationMethods.getTeamInvitation;
  getInvitedAccountUserId = invitationMethods.getInvitedAccountUserId;
  getAuthEmailConfirmationLink = invitationMethods.getAuthEmailConfirmationLink;
  getOrganizationMembership = invitationMethods.getOrganizationMembership;
  assignPlatformRole = invitationMethods.assignPlatformRole;
  authUserExists = invitationMethods.authUserExists;
  getTemplateExportCounts = templateMethods.getTemplateExportCounts;
  getFirstResourceId = templateMethods.getFirstResourceId;
  createTemplateInstance = templateMethods.createTemplateInstance;
  createTemplateExport = templateMethods.createTemplateExport;
  createTemplateExportDownload = templateMethods.createTemplateExportDownload;
  createWorkspaceProvisioningRequest = templateMethods.createWorkspaceProvisioningRequest;
  getDefaultCommunity = communityMethods.getDefaultCommunity;
  getCommunitySpace = communityMethods.getCommunitySpace;
  assignCommunityManager = communityMethods.assignCommunityManager;
  createCommunityPost = communityMethods.createCommunityPost;
  getPendingCommunityPostModerationEventId = communityMethods.getPendingCommunityPostModerationEventId;
  createCommunityComment = communityMethods.createCommunityComment;
  createCommunityEvent = communityMethods.createCommunityEvent;
  createEvent = eventMethods.createEvent;
  trackEventCleanup = eventMethods.trackEventCleanup;
  updateEvent = eventMethods.updateEvent;
  getEventRegistration = eventMethods.getEventRegistration;
  getEventByTitle = eventMethods.getEventByTitle;
  getEventPlanAccess = eventMethods.getEventPlanAccess;
  getEventRegistrationCount = eventMethods.getEventRegistrationCount;
  getEventEmailIntegrationEvents = eventMethods.getEventEmailIntegrationEvents;
  createEventRegistration = eventMethods.createEventRegistration;
  getConsultingRequestByTitle = consultingReviewMethods.getConsultingRequestByTitle;
  getConsultingRequestCountByTitle = consultingReviewMethods.getConsultingRequestCountByTitle;
  getConsultingRequestActivity = consultingReviewMethods.getConsultingRequestActivity;
  getConsultingTimeEntries = consultingReviewMethods.getConsultingTimeEntries;
  clearNotifications = consultingReviewMethods.clearNotifications;
  createNotification = consultingReviewMethods.createNotification;
  getNotification = consultingReviewMethods.getNotification;
  getEdReviewCycleState = consultingReviewMethods.getEdReviewCycleState;
  getEdReviewReviewerAssignments = consultingReviewMethods.getEdReviewReviewerAssignments;
  removeEdReviewReviewerAssignment = consultingReviewMethods.removeEdReviewReviewerAssignment;
  revokeEdReviewBoardChair = consultingReviewMethods.revokeEdReviewBoardChair;

  async purge() {
    if (this.purged) return;

    const errors: Error[] = [];
    for (const task of [...this.cleanupTasks].reverse()) {
      try {
        await task.run();
      } catch (error) {
        errors.push(
          new Error(
            `${task.label}: ${
              error instanceof Error ? error.message : "Unknown cleanup error"
            }`,
          ),
        );
      }
    }

    if (errors.length) {
      throw new Error(
        `Test data cleanup failed:\n${errors
          .map((error) => `- ${error.message}`)
          .join("\n")}`,
      );
    }

    this.purged = true;
  }
}

export const test = base.extend<{ testData: TestDataManager }>({
  testData: async ({ browserName: _browserName }, use, testInfo) => {
    const { url, serviceRoleKey } = getTestSupabaseEnvironment();
    const supabase = createClient(url, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
    const manager = new TestDataManager(supabase, testInfo);

    try {
      await use(manager);
    } finally {
      await manager.purge();
    }
  },
});

export { expect } from "./browser.fixture";
