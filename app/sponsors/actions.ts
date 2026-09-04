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
  upsertGrantProgramContribution,
  upsertSponsorPrimaryContact,
  writeSponsorAudit,
} from "./action-support";
import { validateOptionalCurrencyToCents } from "@/lib/sponsors/domain";

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
    const values = buildSponsorshipTermValues(formData);

    if (!values.package_id) throw new Error("Choose a sponsorship package.");
    const query = sponsorshipId
      ? admin.from("sponsorships").update(values).eq("id", sponsorshipId)
      : admin.from("sponsorships").insert({ ...values, created_by: userId });

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

    const grantProgramId = selectText(formData, "grantProgramId");
    const grantRoundId = selectText(formData, "grantRoundId");
    const allocationAmountCents = validateOptionalCurrencyToCents(
      text(formData, "allocationAmount"),
      "Allocation amount",
    );

    await upsertGrantProgramContribution({
      admin,
      allocationAmountCents,
      contributionId: contribution.id,
      grantProgramId,
      grantRoundId,
    });

    await writeSponsorAudit({
      action: contributionId
        ? "sponsor_contribution.updated"
        : "sponsor_contribution.created",
      changes: {
        ...values,
        allocation_amount_cents: allocationAmountCents,
        grant_program_id: grantProgramId || null,
        grant_round_id: grantRoundId || null,
      },
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
