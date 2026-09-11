import { describe, expect, it } from "vitest";

import { buildGrantPlatformWorkspaceData } from "@/lib/data/grant-platform-mappers";
import type {
  GrantPlatformApplicationRow,
  GrantPlatformFunderInteractionRow,
  GrantPlatformMemberRow,
  GrantPlatformPartnerRow,
  GrantPlatformSettingsRow,
} from "@/lib/data/grant-platform-queries";

const access = {
  canEditOrgProfile: true,
  canViewBudgets: true,
  canViewReports: true,
};

describe("grant platform workspace mapper", () => {
  it("maps funder metadata, CRM interactions, and organization grant profile fields", () => {
    const settings: GrantPlatformSettingsRow = {
      board_chair_email: "chair@example.org",
      board_chair_name: "Sam Chair",
      board_chair_phone: "(604) 555-0123",
      board_chair_user_id: "11111111-1111-4111-8111-111111111111",
      charity_registration_number: "123456789RR0001",
      current_annual_revenue_cents: 12500000,
      funding_sources: ["Government Funding"],
      organization_type: "Growing ($250K-$1M)",
      society_number: "S-12345",
    };
    const applications: GrantPlatformApplicationRow[] = [
      {
        collaboration_note: null,
        focus_area: "operational_capacity",
        funding_request: "Planning entry for BC Gaming",
        grant_awards: null,
        grant_rounds: {
          closes_at: "2026-11-30T23:59:59.000Z",
          name: "BC Gaming",
          public_notes: "Funder: Province of British Columbia\nNotes: Annual intake",
        },
        id: "22222222-2222-4222-8222-222222222222",
        requested_amount_cents: 500000,
        round_id: "33333333-3333-4333-8333-333333333333",
        status: "draft",
        submitted_at: null,
        updated_at: "2026-09-10T12:00:00.000Z",
      },
    ];
    const partners: GrantPlatformPartnerRow[] = [
      {
        added_note: null,
        contact_name: "Funding Officer",
        email: "officer@gov.bc.ca",
        focus_areas: "Community gaming",
        id: "44444444-4444-4444-8444-444444444444",
        last_collaboration: null,
        name: "Province of British Columbia",
        notes: "Annual relationship.",
        partner_type: "Government Agency",
        phone: "(604) 555-0199",
        status: "Active Collaborator",
      },
    ];
    const funderInteractions: GrantPlatformFunderInteractionRow[] = [
      {
        contact_method: "meeting",
        contact_name: "Funding Officer",
        follow_up_date: "2026-10-01",
        id: "55555555-5555-4555-8555-555555555555",
        interaction_date: "2026-09-10",
        next_action: "Confirm eligibility details.",
        partner_id: partners[0].id,
        summary: "Reviewed upcoming application dates.",
      },
    ];
    const members: GrantPlatformMemberRow[] = [
      {
        email: "chair@example.org",
        full_name: "Sam Chair",
        role: "admin",
        status: "active",
        user_id: settings.board_chair_user_id!,
      },
    ];

    const data = buildGrantPlatformWorkspaceData({
      access,
      funderInteractions,
      members,
      organization: { name: "BoraPost" },
      organizationRecord: { name: "BoraPost" },
      organizationSettings: settings,
      partners,
      profileMap: new Map(),
      rawApplications: applications,
      rawRounds: [],
      vaultItems: [],
    });

    expect(data.applications[0]).toMatchObject({
      funderName: "Province of British Columbia",
      roundName: "BC Gaming",
    });
    expect(data.organizationSettings).toMatchObject({
      boardChairEmail: "chair@example.org",
      boardChairName: "Sam Chair",
      charityRegistrationNumber: "123456789RR0001",
      societyNumber: "S-12345",
    });
    expect(data.partners[0].interactions[0]).toMatchObject({
      nextAction: "Confirm eligibility details.",
      summary: "Reviewed upcoming application dates.",
    });
    expect(data.teamMembers[0]).toMatchObject({
      displayName: "Sam Chair",
      email: "chair@example.org",
    });
  });
});
