"use server";

import { revalidatePath } from "next/cache";

import {
  buildSponsorContributionValues,
  buildSponsorProfileValues,
  buildSponsorshipTermValues,
  getActionErrorMessage,
  requireSponsorManager,
  selectText,
  text,
  upsertSponsorPrimaryContact,
  writeSponsorAudit,
} from "./action-support";

export type SponsorActionState = {
  message: string;
  status: "error" | "idle" | "success";
};

export async function saveSponsorProfile(
  _previousState: SponsorActionState,
  formData: FormData,
): Promise<SponsorActionState> {
  try {
    const { admin, organizationId, userId } = await requireSponsorManager();
    const sponsorId = selectText(formData, "sponsorId");
    const values = buildSponsorProfileValues(formData);

    const query = sponsorId
      ? admin.from("sponsors").update(values).eq("id", sponsorId)
      : admin.from("sponsors").insert(values);

    const { data: sponsor, error } = await query.select("id").single();
    if (error) throw error;

    await upsertSponsorPrimaryContact(admin, formData, sponsor.id);

    await writeSponsorAudit({
      action: sponsorId ? "sponsor.updated" : "sponsor.created",
      changes: values,
      entityId: sponsor.id,
      entityType: "sponsor",
      organizationId,
      userId,
    });
    revalidatePath("/sponsors");

    return {
      message: sponsorId
        ? "Sponsor profile updated."
        : "Sponsor profile created.",
      status: "success",
    };
  } catch (error) {
    return {
      message: getActionErrorMessage(
        error,
        "Sponsor profile could not be saved.",
      ),
      status: "error",
    };
  }
}

export async function saveSponsorshipTerm(
  _previousState: SponsorActionState,
  formData: FormData,
): Promise<SponsorActionState> {
  try {
    const { admin, organizationId, userId } = await requireSponsorManager();
    const sponsorshipId = text(formData, "sponsorshipId");
    if (text(formData, "committedContribution")) {
      throw new Error("New Olea grant commitments are no longer available.");
    }
    const values = buildSponsorshipTermValues(formData);

    if (!values.package_id) throw new Error("Choose a sponsorship package.");
    const query = sponsorshipId
      ? admin.from("sponsorships").update(values).eq("id", sponsorshipId)
      : admin.from("sponsorships").insert({
          ...values,
          committed_contribution_cents: 0,
          created_by: userId,
        });

    const { data: sponsorship, error } = await query.select("id").single();
    if (error) throw error;

    await writeSponsorAudit({
      action: sponsorshipId ? "sponsorship.updated" : "sponsorship.created",
      changes: values,
      entityId: sponsorship.id,
      entityType: "sponsorship",
      metadata: { sponsor_id: values.sponsor_id },
      organizationId,
      userId,
    });
    revalidatePath("/sponsors");

    return {
      message: sponsorshipId
        ? "Sponsorship terms updated."
        : "Sponsorship terms saved.",
      status: "success",
    };
  } catch (error) {
    return {
      message: getActionErrorMessage(
        error,
        "Sponsorship terms could not be saved.",
      ),
      status: "error",
    };
  }
}

export async function saveSponsorContribution(
  _previousState: SponsorActionState,
  formData: FormData,
): Promise<SponsorActionState> {
  try {
    const { admin, organizationId, userId } = await requireSponsorManager();
    if (
      selectText(formData, "grantProgramId") ||
      selectText(formData, "grantRoundId") ||
      text(formData, "allocationAmount")
    ) {
      throw new Error("Olea grant allocations are no longer available.");
    }
    const contributionId = text(formData, "contributionId");
    const values = buildSponsorContributionValues(formData);

    const query = contributionId
      ? admin
          .from("sponsor_contributions")
          .update(values)
          .eq("id", contributionId)
      : admin.from("sponsor_contributions").insert(values);
    const { data: contribution, error } = await query.select("id").single();

    if (error) throw error;

    await writeSponsorAudit({
      action: contributionId
        ? "sponsor_contribution.updated"
        : "sponsor_contribution.created",
      changes: values,
      entityId: contribution.id,
      entityType: "sponsor_contribution",
      metadata: { sponsorship_id: values.sponsorship_id },
      organizationId,
      userId,
    });
    revalidatePath("/sponsors");

    return {
      message: contributionId ? "Contribution updated." : "Contribution saved.",
      status: "success",
    };
  } catch (error) {
    return {
      message: getActionErrorMessage(error, "Contribution could not be saved."),
      status: "error",
    };
  }
}
