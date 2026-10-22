"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CurrencyInput } from "@/components/ui/currency-input";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { FormSelect } from "@/components/ui/form-select";
import type {
  SponsorBoardTarget,
  SponsoredPlacement,
  SponsorableOrganization,
} from "@/lib/data/sponsor-funding";
import type { SponsorReport } from "@/lib/types";
import { reportedBudgetMatchesTier } from "@/lib/sponsors/impact";

import { activateSponsoredMembership, type SponsorActionState } from "./actions";

const initialState: SponsorActionState = { message: "", status: "idle" };
type FundingPlan = "seedling" | "roots";
type ActiveTerm = SponsorReport["sponsorships"][number] & { sponsorName: string };

function remainingPlaces(term: ActiveTerm, target: SponsorBoardTarget, placements: SponsoredPlacement[]) {
  const used = placements.filter((placement) =>
    placement.sponsorshipId === term.id &&
    placement.planId === target.planId &&
    placement.status !== "canceled"
  ).length;
  return Math.max(0, target.boardCount - used);
}

function formatMoney(amount: number, isFrench: boolean) {
  return new Intl.NumberFormat(isFrench ? "fr-CA" : "en-CA", {
    style: "currency", currency: "CAD", maximumFractionDigits: 2,
  }).format(amount);
}

function remainingPlaceLabel(count: number, isFrench: boolean) {
  return isFrench
    ? `${count} ${count === 1 ? "place restante" : "places restantes"}`
    : `${count} ${count === 1 ? "board remaining" : "boards remaining"}`;
}

function formatDate(value: string, isFrench: boolean) {
  return new Intl.DateTimeFormat(isFrench ? "fr-CA" : "en-CA", {
    dateStyle: "medium", timeZone: "UTC",
  }).format(new Date(value));
}

export function SponsorFundingManagement({
  activationConfirmed,
  isFrench,
  onBeginReview,
  organizations,
  placements,
  reports,
  targets,
}: {
  activationConfirmed: boolean;
  isFrench: boolean;
  onBeginReview: () => void;
  organizations: SponsorableOrganization[];
  placements: SponsoredPlacement[];
  reports: SponsorReport[];
  targets: SponsorBoardTarget[];
}) {
  const [state, setState] = useState<SponsorActionState>(initialState);
  const formRef = useRef<HTMLFormElement>(null);
  const budgetRef = useRef<HTMLInputElement>(null);
  const [sponsorshipId, setSponsorshipId] = useState("");
  const [planId, setPlanId] = useState("");
  const [organizationId, setOrganizationId] = useState("");
  const [verifiedBudget, setVerifiedBudget] = useState("");
  const [showOtherOrganizations, setShowOtherOrganizations] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const [budgetResetKey, setBudgetResetKey] = useState(0);

  useEffect(() => {
    if (!activationConfirmed) return;
    setSubmitting(false);
    formRef.current?.reset();
    setSponsorshipId("");
    setPlanId("");
    setOrganizationId("");
    setVerifiedBudget("");
    setShowOtherOrganizations(false);
    setFormError("");
    setBudgetResetKey((current) => current + 1);
  }, [activationConfirmed]);

  const activeTerms: ActiveTerm[] = reports.flatMap((sponsor) =>
    sponsor.sponsorships
      .filter((sponsorship) =>
        sponsorship.status === "active" &&
        targets.some((target) => target.packageId === sponsorship.packageId)
      )
      .map((sponsorship) => ({
        ...sponsorship,
        sponsorName: sponsor.name,
      })),
  );
  const termsWithPlaces = activeTerms.filter((term) =>
    targets.some((target) => target.packageId === term.packageId && remainingPlaces(term, target, placements) > 0)
  );
  const selectedTerm = activeTerms.find((term) => term.id === sponsorshipId);
  const availableTargets = targets.filter((target) =>
    selectedTerm && target.packageId === selectedTerm.packageId && remainingPlaces(selectedTerm, target, placements) > 0
  );
  const selectedTarget = availableTargets.find((target) => target.planId === planId);
  const selectedOrganization = organizations.find((organization) => organization.id === organizationId);
  const suggestedOrganizations = planId
    ? organizations.filter((organization) => organization.annualBudgetRange &&
        reportedBudgetMatchesTier(organization.annualBudgetRange, planId as FundingPlan))
    : [];
  const visibleOrganizations = !planId ? [] : showOtherOrganizations ? organizations : suggestedOrganizations;
  const confirmedBudget = Number(verifiedBudget);
  const budgetMatchesTier = planId === "seedling"
    ? confirmedBudget > 0 && confirmedBudget < 500_000
    : planId === "roots" && confirmedBudget >= 500_000 && confirmedBudget <= 2_000_000;

  function reviewActivation() {
    onBeginReview();
    if (!selectedTerm || !selectedTarget || !selectedOrganization) {
      setFormError(isFrench
        ? "Choisissez une commandite, un niveau avec des places et un organisme."
        : "Choose a sponsorship, a tier with places available, and an organization.");
      return;
    }
    if (!formRef.current?.reportValidity()) return;
    if (!budgetMatchesTier) {
      setFormError(isFrench
        ? "Le budget confirmé doit correspondre au niveau choisi."
        : "The confirmed budget must match the selected tier.");
      budgetRef.current?.focus();
      return;
    }
    setFormError("");
    setReviewOpen(true);
  }

  function handleFormSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    reviewActivation();
  }

  async function confirmActivation() {
    if (!selectedTerm || !selectedTarget || !selectedOrganization || !budgetMatchesTier) {
      setReviewOpen(false);
      reviewActivation();
      return;
    }
    if (!formRef.current) return;
    setSubmitting(true);
    setReviewOpen(false);
    setState(initialState);
    try {
      const result = await activateSponsoredMembership(initialState, new FormData(formRef.current));
      if (result.status === "success" && result.placementId) {
        window.location.assign(`/sponsors?admin=funding&placement=${encodeURIComponent(result.placementId)}#funded-boards`);
        return;
      }
      setState(result.status === "success"
        ? { status: "error", message: isFrench
          ? "L'adhésion a été activée, mais la confirmation ne s'affiche pas. Actualisez la page avant de réessayer."
          : "The funded membership was activated, but its confirmation could not be displayed. Refresh the sponsor page before trying again." }
        : result);
    } catch {
      setState({ status: "error", message: isFrench
        ? "Impossible de confirmer l'adhésion financée. Actualisez la page avant de réessayer."
        : "Funded membership could not be confirmed. Refresh the sponsor page before trying again." });
    }
    setSubmitting(false);
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="font-bold text-slate-900">{isFrench ? "Adhésions financées" : "Funded memberships"}</h2>
        <p className="mt-1 text-sm leading-6 text-slate-600">
          {isFrench
            ? "Attribuez une année d'adhésion à un organisme canadien admissible après la réception du paiement de commandite. L'organisme doit avoir déclaré un budget annuel, confirmé par l'équipe des finances, et ne pas avoir d'adhésion active."
            : "Place an eligible Canadian nonprofit after its sponsorship payment is recorded as received. Each placement activates one full year of Seedling or Roots access. The organization must have a declared annual budget confirmed by finance and no active membership."}
        </p>
      </div>

      {state?.message ? (
        <p
          role={state?.status === "error" ? "alert" : "status"}
          className={`rounded-lg border p-3 text-sm ${
            state?.status === "error"
              ? "border-red-200 bg-red-50 text-red-800"
              : "border-green-200 bg-green-50 text-green-800"
          }`}
        >
          {state?.message}
        </p>
      ) : null}
      {termsWithPlaces.length ? (
        <form ref={formRef} onSubmit={handleFormSubmit} className="rounded-xl border bg-slate-50 p-5">
          {formError ? <p role="alert" className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">{formError}</p> : null}
          <div className="grid gap-4 md:grid-cols-2">
            <label className="min-w-0 text-sm font-semibold text-slate-700">
              {isFrench ? "Commandite active" : "Active sponsorship"}
              <FormSelect
                name="sponsorshipId"
                required
                value={sponsorshipId}
                onValueChange={(id) => {
                  setSponsorshipId(id);
                  setPlanId("");
                  setOrganizationId("");
                  setShowOtherOrganizations(false);
                  setFormError("");
                }}
                placeholder={isFrench ? "Choisissez une commandite" : "Choose sponsorship"}
                options={termsWithPlaces.map((term) => ({
                  label: `${term.sponsorName} · ${term.packageName}`,
                  value: term.id,
                }))}
              />
            </label>
            <label className="min-w-0 text-sm font-semibold text-slate-700">
              {isFrench ? "Niveau d'adhésion" : "Membership tier"}
              <FormSelect
                key={sponsorshipId}
                name="planId"
                required
                value={planId}
                onValueChange={(id) => {
                  setPlanId(id);
                  setOrganizationId("");
                  setShowOtherOrganizations(false);
                  setFormError("");
                }}
                placeholder={sponsorshipId
                  ? isFrench ? "Choisissez un niveau financé" : "Choose funded tier"
                  : isFrench ? "Choisissez d'abord une commandite" : "Choose sponsorship first"}
                options={availableTargets.map((target) => ({
                  label: `${target.planId === "roots" ? "Roots" : "Seedling"} · ${remainingPlaceLabel(remainingPlaces(selectedTerm!, target, placements), isFrench)}`,
                  value: target.planId,
                }))}
              />
            </label>
            <label className="min-w-0 text-sm font-semibold text-slate-700">
              {isFrench ? "Organisme admissible" : "Eligible organization"}
              <FormSelect
                key={`${sponsorshipId}-${planId}`}
                name="organizationId"
                required
                value={organizationId}
                onValueChange={(id) => { setOrganizationId(id); setFormError(""); }}
                placeholder={planId
                  ? isFrench ? "Choisissez un organisme" : "Choose organization"
                  : isFrench ? "Choisissez d'abord un niveau d'adhésion" : "Choose membership tier first"}
                options={visibleOrganizations.map((organization) => ({
                  label: `${organization.name} · ${isFrench ? organization.budgetLabelFr : organization.budgetLabel}`,
                  value: organization.id,
                }))}
              />
              {planId && !showOtherOrganizations ? (
                <span className="mt-1 block text-xs font-normal text-slate-500">
                  {isFrench ? "Suggestions selon le budget déclaré; confirmez le budget réel avant l'activation." : "Suggested from the reported budget; confirm the actual budget before activation."}
                </span>
              ) : null}
            </label>
            <label className="min-w-0 text-sm font-semibold text-slate-700">
              {isFrench ? "Budget annuel confirmé (CAD)" : "Confirmed annual budget (CAD)"}
              <CurrencyInput key={budgetResetKey} ref={budgetRef} name="verifiedBudget" required maxLength={12}
                onChange={(event) => { setVerifiedBudget(event.currentTarget.value); setFormError(""); }}
                placeholder={isFrench ? "Exemple : 450000" : "Example: 450000"} className="mt-2 h-11 bg-white" />
            </label>
          </div>
          {planId && organizations.length === 0 ? (
            <p className="mt-3 text-sm text-amber-900">
              {isFrench ? "Aucun organisme canadien sans adhésion active n'est disponible." : "No Canadian nonprofit without an active membership is available."}
            </p>
          ) : null}
          {planId && suggestedOrganizations.length === 0 && !showOtherOrganizations && organizations.length > 0 ? (
            <p className="mt-3 text-sm text-amber-900">
              {isFrench ? "Aucun organisme suggéré pour ce niveau. Vous pouvez examiner les autres organismes et confirmer leur budget." : "No organizations are suggested for this tier. You can review other organizations and confirm their budget."}
            </p>
          ) : null}
          {planId && organizations.length > suggestedOrganizations.length ? (
            <Button type="button" variant="outline" size="sm" className="mt-3" onClick={() => {
              if (showOtherOrganizations && selectedOrganization && !suggestedOrganizations.some((item) => item.id === selectedOrganization.id)) {
                setOrganizationId("");
              }
              setShowOtherOrganizations((current) => !current);
            }}>
              {showOtherOrganizations
                ? isFrench ? "Afficher seulement les organismes suggérés" : "Show suggested organizations only"
                : isFrench ? "Afficher les autres organismes" : "Show other organizations"}
            </Button>
          ) : null}
          <p className="mt-3 text-xs leading-5 text-slate-500">
            {isFrench
              ? "Confirmez le budget annuel réel avant l'activation : Seedling exige moins de 500 000 $ CA; Roots exige de 500 000 $ CA à 2 000 000 $ CA. Le financement reçu et les limites du forfait sont revérifiés à l'envoi."
              : "Confirm the nonprofit's actual annual budget before activation: Seedling must be below CA$500,000; Roots must be CA$500,000 to CA$2,000,000. Received funding and package limits are checked again when you submit."}
          </p>
          {verifiedBudget && planId && !budgetMatchesTier ? (
            <p className="mt-2 text-sm text-red-800">
              {isFrench ? "Le budget confirmé doit correspondre au niveau choisi." : "The confirmed budget must match the selected tier."}
            </p>
          ) : null}
          <div className="mt-5">
            <Button type="button" disabled={submitting} onClick={reviewActivation}>
              {isFrench ? "Vérifier l'activation" : "Review activation"}
            </Button>
          </div>
        </form>
      ) : (
        <p className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          {activeTerms.length
            ? isFrench ? "Toutes les places financées des commandites actives sont attribuées." : "All funded board places in active sponsorships have been assigned."
            : isFrench ? "Ajoutez et activez une commandite avant d'attribuer des organismes." : "Add and activate a sponsorship term before placing organizations."}
        </p>
      )}

      <Dialog open={reviewOpen} onOpenChange={setReviewOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{isFrench ? "Confirmer l'année financée?" : "Activate this funded year?"}</DialogTitle>
            <DialogDescription>
              {isFrench
                ? "Vérifiez les détails ci-dessous. La confirmation active immédiatement une année d'adhésion pour l'organisme."
                : "Check the details below. Confirming immediately starts a one-year membership for the organization."}
            </DialogDescription>
          </DialogHeader>
          <dl className="grid gap-3 rounded-lg border bg-slate-50 p-4 text-sm sm:grid-cols-2">
            <div><dt className="text-slate-500">{isFrench ? "Commandite" : "Sponsorship"}</dt><dd className="font-semibold">{selectedTerm ? `${selectedTerm.sponsorName} · ${selectedTerm.packageName}` : "—"}</dd></div>
            <div><dt className="text-slate-500">{isFrench ? "Organisme" : "Organization"}</dt><dd className="font-semibold">{selectedOrganization?.name ?? "—"}</dd></div>
            <div><dt className="text-slate-500">{isFrench ? "Niveau" : "Tier"}</dt><dd className="font-semibold">{planId === "roots" ? "Roots" : "Seedling"}</dd></div>
            <div><dt className="text-slate-500">{isFrench ? "Budget annuel confirmé" : "Confirmed annual budget"}</dt><dd className="font-semibold">{Number.isFinite(confirmedBudget) ? formatMoney(confirmedBudget, isFrench) : "—"}</dd></div>
            <div><dt className="text-slate-500">{isFrench ? "Montant attribué par la commandite" : "Sponsorship allocation"}</dt><dd className="font-semibold">{selectedTarget ? formatMoney(selectedTarget.allocationCents / 100, isFrench) : "—"}</dd></div>
            <div><dt className="text-slate-500">{isFrench ? "Durée" : "Duration"}</dt><dd className="font-semibold">{isFrench ? "Un an dès l'activation" : "One year from activation"}</dd></div>
          </dl>
          <DialogFooter>
            <DialogClose asChild><Button type="button" variant="outline">{isFrench ? "Retour" : "Go back"}</Button></DialogClose>
            <Button type="button" disabled={submitting} onClick={confirmActivation}>
              {submitting ? isFrench ? "Activation..." : "Activating..." : isFrench ? "Activer l'année financée" : "Activate funded year"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {activeTerms.map((term) => {
        const termTargets = targets.filter((target) => target.packageId === term.packageId);
        const termPlacements = placements.filter((placement) =>
          placement.sponsorshipId === term.id && placement.status !== "canceled"
        );
        return (
          <section key={term.id} className="rounded-xl border bg-white p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="font-semibold text-slate-900">
                {term.sponsorName} · {term.packageName}
              </h3>
              <Badge variant="outline">
                {isFrench
                  ? `${termPlacements.length} conseils sur ${termTargets.reduce((total, target) => total + target.boardCount, 0)}`
                  : `${termPlacements.length} of ${termTargets.reduce((total, target) => total + target.boardCount, 0)} boards`}
              </Badge>
            </div>
            <div className="mt-3 flex flex-wrap gap-3 text-sm text-slate-600">
              {termTargets.map((target) => (
                <span key={target.planId}>
                  {target.planId === "roots" ? "Roots" : "Seedling"}: {termPlacements.filter((placement) => placement.planId === target.planId).length}/{target.boardCount}
                  {" · "}{remainingPlaceLabel(remainingPlaces(term, target, placements), isFrench)}
                </span>
              ))}
            </div>
            {termPlacements.length ? (
              <ul className="mt-4 divide-y border-t text-sm">
                {termPlacements.map((placement) => (
                  <li key={placement.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                    <span>{placement.organizationName ?? (isFrench ? "Organisme" : "Organization")} · {placement.planId === "roots" ? "Roots" : "Seedling"}</span>
                    <span className="text-slate-500">
                      {placement.status === "active" ? isFrench ? "Active" : "Active" : isFrench ? "Terminée" : "Completed"} · {isFrench ? "fin le" : "ends"} {formatDate(placement.endsAt, isFrench)}
                    </span>
                  </li>
                ))}
              </ul>
            ) : null}
          </section>
        );
      })}
    </div>
  );
}
