"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { validateCurrencyToCents } from "@/lib/sponsors/domain";

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

const sponsoredMembershipInput = z.object({
  sponsorshipId: z.uuid(),
  organizationId: z.uuid(),
  planId: z.enum(["seedling", "roots"]),
});

export async function activateSponsoredMembership(
  _previousState: SponsorActionState,
  formData: FormData,
): Promise<SponsorActionState> {
  let placementId = "";
  try {
    const { admin, userId } = await requireSponsorManager();
    const parsed = sponsoredMembershipInput.safeParse({
      sponsorshipId: selectText(formData, "sponsorshipId"),
      organizationId: selectText(formData, "organizationId"),
      planId: selectText(formData, "planId"),
    });
    if (!parsed.success) {
      throw new Error("Choose a sponsorship, eligible organization, and Seedling or Roots plan.");
    }
    const verifiedBudgetCents = validateCurrencyToCents(
      selectText(formData, "verifiedBudget"), "Verified annual budget",
    );
    if (verifiedBudgetCents > 200000000) {
      throw new Error("The verified annual budget must be CA$2,000,000 or less.");
    }

    const { data, error } = await admin.rpc("activate_sponsored_membership", {
      p_sponsorship_id: parsed.data.sponsorshipId,
      p_organization_id: parsed.data.organizationId,
      p_plan_id: parsed.data.planId,
      p_verified_budget_cents: verifiedBudgetCents,
      p_created_by: userId,
    });
    if (error) throw error;
    const parsedPlacementId = z.uuid().safeParse(data);
    if (!parsedPlacementId.success) {
      throw new Error("The funded membership was activated, but its placement could not be verified. Refresh the sponsor page before trying again.");
    }
    placementId = parsedPlacementId.data;
    revalidatePath("/sponsors");
    revalidatePath("/dashboard");
  } catch (error) {
    return {
      message: getActionErrorMessage(error, "Funded membership could not be activated."),
      status: "error",
    };
  }
  redirect(`/sponsors?admin=funding&placement=${encodeURIComponent(placementId)}#funded-boards`);
}

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
    const { data: selectedPackage, error: packageError } = await admin
      .from("sponsorship_packages")
      .select("category_exclusivity")
      .eq("id", values.package_id)
      .single();
    if (packageError) throw packageError;
    if (selectedPackage.category_exclusivity && values.status === "active") {
      const category = values.category_exclusivity?.trim();
      if (!category) {
        throw new Error("Enter the exclusive industry category before activating this package.");
      }
      const { data: overlappingTerms, error: overlapError } = await admin
        .from("sponsorships")
        .select("id, category_exclusivity")
        .eq("status", "active")
        .lte("starts_on", values.ends_on)
        .gte("ends_on", values.starts_on)
        .not("category_exclusivity", "is", null);
      if (overlapError) throw overlapError;
      const conflict = (overlappingTerms ?? []).some((term) =>
        term.id !== sponsorshipId &&
        term.category_exclusivity?.trim().toLowerCase() === category.toLowerCase()
      );
      if (conflict) {
        throw new Error("Another active sponsor already has this category during the chosen dates.");
      }
    }
    const query = sponsorshipId
      ? admin.from("sponsorships").update(values).eq("id", sponsorshipId)
      : admin.from("sponsorships").insert({
          ...values,
          committed_contribution_cents: 0,
          created_by: userId,
        });

    const { data: sponsorship, error } = await query.select("id").single();
    if (error?.message === "Sponsorship package cannot change after funded boards are placed.") {
      throw new Error(
        "This sponsorship already funds boards. Keep its package and create a new sponsorship term for a different package.",
      );
    }
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
