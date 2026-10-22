"use client";

import { Edit3, Handshake, Plus, Search, Trash2 } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useFormState } from "react-dom";

import {
  deleteGrantPlatformFunderInteraction,
  saveGrantPlatformFunderInteraction,
  saveGrantPlatformPartner,
} from "@/app/modules/grant-platform/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import type { GrantPlatformWorkspaceData } from "@/lib/data/grant-platform";

type Partner = GrantPlatformWorkspaceData["partners"][number];
type Interaction = Partner["interactions"][number];

const partnerType = "Government Agency";
const partnerStatus = "Active Collaborator";

function formatCurrency(cents: number) {
  return new Intl.NumberFormat("en-CA", {
    currency: "CAD",
    maximumFractionDigits: 0,
    style: "currency",
  }).format(cents / 100);
}

function formatDate(value: string | null) {
  if (!value) return "Not set";
  return new Date(`${value}T00:00:00`).toLocaleDateString("en-CA", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function contactMethodLabel(value: string) {
  const labels: Record<string, string> = {
    email: "Email",
    meeting: "Meeting",
    other: "Other",
    phone: "Phone",
    portal: "Portal",
  };
  return labels[value] ?? value;
}

function applicationsForFunder(
  applications: GrantPlatformWorkspaceData["applications"],
  funder: Partner,
) {
  const funderName = funder.name.toLowerCase();
  return applications.filter((application) => {
    return (
      application.funderName.toLowerCase() === funderName ||
      application.roundName.toLowerCase().includes(funderName) ||
      application.fundingRequest.toLowerCase().includes(funderName)
    );
  });
}

function FunderRelationshipDialog({
  canEditOrgProfile,
  onOpenChange,
  open,
}: {
  canEditOrgProfile: boolean;
  onOpenChange: (open: boolean) => void;
  open: boolean;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const [state, formAction] = useFormState(saveGrantPlatformPartner, {
    message: "",
    success: false,
  });

  useEffect(() => {
    if (!state.success) return;
    formRef.current?.reset();
    onOpenChange(false);
  }, [onOpenChange, state.success]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Add funder relationship</DialogTitle>
          <DialogDescription>
            Add the funder contact details your team will use for follow-up and reporting.
          </DialogDescription>
        </DialogHeader>
        <form ref={formRef} action={formAction} className="space-y-4">
          <input name="partnerId" type="hidden" value="" />
          <input name="partnerType" type="hidden" value={partnerType} />
          <input name="partnerStatus" type="hidden" value={partnerStatus} />
          <input name="partnerAddedNote" type="hidden" value="" />
          <input name="partnerLastCollaboration" type="hidden" value="" />
          <div className="grid gap-4 md:grid-cols-2">
            <label className="space-y-2 text-sm font-medium text-slate-700">
              Funder name
              <Input
                disabled={!canEditOrgProfile}
                name="partnerName"
                placeholder="Province of B.C."
                required
              />
            </label>
            <label className="space-y-2 text-sm font-medium text-slate-700">
              Primary contact
              <Input
                disabled={!canEditOrgProfile}
                name="partnerContact"
                placeholder="Program officer name"
                required
              />
            </label>
            <label className="space-y-2 text-sm font-medium text-slate-700">
              Email
              <Input
                data-format="email"
                disabled={!canEditOrgProfile}
                name="partnerEmail"
                placeholder="contact@example.org"
                required
                type="email"
              />
            </label>
            <label className="space-y-2 text-sm font-medium text-slate-700">
              Phone
              <Input
                disabled={!canEditOrgProfile}
                name="partnerPhone"
                placeholder="(604) 555-0000"
                required
                type="tel"
              />
            </label>
            <label className="space-y-2 text-sm font-medium text-slate-700 md:col-span-2">
              Grant programs or focus areas
              <Input
                disabled={!canEditOrgProfile}
                name="partnerFocus"
                placeholder="Community Gaming Grant, arts, youth, public safety"
                required
              />
            </label>
            <label className="space-y-2 text-sm font-medium text-slate-700 md:col-span-2">
              Notes
              <Textarea
                disabled={!canEditOrgProfile}
                name="partnerNotes"
                placeholder="Relationship history, eligibility notes, and program preferences."
                rows={4}
              />
            </label>
          </div>
          {state.message ? (
            <p className={`text-sm ${state.success ? "text-olea-green" : "text-red-600"}`}>
              {state.message}
            </p>
          ) : null}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button disabled={!canEditOrgProfile} type="submit">
              Save funder
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function FunderInteractionDialog({
  canEditOrgProfile,
  interaction,
  onOpenChange,
  open,
  partner,
}: {
  canEditOrgProfile: boolean;
  interaction: Interaction | null;
  onOpenChange: (open: boolean) => void;
  open: boolean;
  partner: Partner | null;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const [state, formAction] = useFormState(saveGrantPlatformFunderInteraction, {
    message: "",
    success: false,
  });
  const [method, setMethod] = useState(interaction?.contactMethod ?? "email");
  const title = interaction ? "Edit funder interaction" : "Add funder interaction";

  useEffect(() => {
    setMethod(interaction?.contactMethod ?? "email");
  }, [interaction?.contactMethod, open]);

  useEffect(() => {
    if (!state.success) return;
    formRef.current?.reset();
    onOpenChange(false);
  }, [onOpenChange, state.success]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            Capture dated funder context so reporting and follow-up are easy to audit.
          </DialogDescription>
        </DialogHeader>
        <form
          key={`${partner?.id ?? "none"}-${interaction?.id ?? "new"}`}
          ref={formRef}
          action={formAction}
          className="space-y-4"
        >
          <input name="partnerId" type="hidden" value={partner?.id ?? ""} />
          <input name="interactionId" type="hidden" value={interaction?.id ?? ""} />
          <input name="contactMethod" type="hidden" value={method} />
          <div className="rounded-lg border bg-slate-50 p-3 text-sm text-slate-700">
            <span className="font-semibold">Funder:</span> {partner?.name ?? "Choose a funder"}
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="space-y-2 text-sm font-medium text-slate-700">
              Interaction date
              <Input
                defaultValue={interaction?.interactionDate ?? ""}
                disabled={!canEditOrgProfile}
                name="interactionDate"
                required
                type="date"
              />
            </label>
            <div className="space-y-2 text-sm font-medium text-slate-700">
              <Label>Contact method</Label>
              <Select
                disabled={!canEditOrgProfile}
                value={method}
                onValueChange={setMethod}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select contact method" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="email">Email</SelectItem>
                  <SelectItem value="phone">Phone</SelectItem>
                  <SelectItem value="meeting">Meeting</SelectItem>
                  <SelectItem value="portal">Portal</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <label className="space-y-2 text-sm font-medium text-slate-700">
              Funder contact
              <Input
                defaultValue={interaction?.contactName ?? partner?.contactName ?? ""}
                disabled={!canEditOrgProfile}
                name="contactName"
                placeholder="Program officer or reviewer"
                required
              />
            </label>
            <label className="space-y-2 text-sm font-medium text-slate-700">
              Follow-up date
              <Input
                defaultValue={interaction?.followUpDate ?? ""}
                disabled={!canEditOrgProfile}
                name="followUpDate"
                type="date"
              />
            </label>
            <label className="space-y-2 text-sm font-medium text-slate-700 md:col-span-2">
              Notes
              <Textarea
                defaultValue={interaction?.summary ?? ""}
                disabled={!canEditOrgProfile}
                name="summary"
                placeholder="What changed, what guidance was received, and what should the team remember?"
                required
                rows={5}
              />
            </label>
            <label className="space-y-2 text-sm font-medium text-slate-700 md:col-span-2">
              Next action
              <Input
                defaultValue={interaction?.nextAction ?? ""}
                disabled={!canEditOrgProfile}
                name="nextAction"
                placeholder="Send draft budget by Friday"
              />
            </label>
          </div>
          {state.message ? (
            <p className={`text-sm ${state.success ? "text-olea-green" : "text-red-600"}`}>
              {state.message}
            </p>
          ) : null}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button disabled={!canEditOrgProfile || !partner} type="submit">
              Save interaction
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function DeleteInteractionDialog({
  canEditOrgProfile,
  interaction,
  onOpenChange,
  open,
}: {
  canEditOrgProfile: boolean;
  interaction: Interaction | null;
  onOpenChange: (open: boolean) => void;
  open: boolean;
}) {
  const [state, formAction] = useFormState(deleteGrantPlatformFunderInteraction, {
    message: "",
    success: false,
  });

  useEffect(() => {
    if (state.success) onOpenChange(false);
  }, [onOpenChange, state.success]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete this funder interaction?</DialogTitle>
          <DialogDescription>
            This removes the dated CRM note from the funder history.
          </DialogDescription>
        </DialogHeader>
        <form action={formAction} className="space-y-4">
          <input name="interactionId" type="hidden" value={interaction?.id ?? ""} />
          {state.message ? (
            <p className={`text-sm ${state.success ? "text-olea-green" : "text-red-600"}`}>
              {state.message}
            </p>
          ) : null}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button disabled={!canEditOrgProfile || !interaction} type="submit" variant="destructive">
              Delete interaction
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function GrantFundersPanel({
  canEditOrgProfile,
  data,
}: {
  canEditOrgProfile: boolean;
  data: GrantPlatformWorkspaceData;
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [addFunderOpen, setAddFunderOpen] = useState(false);
  const [interactionDialogOpen, setInteractionDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedPartnerId, setSelectedPartnerId] = useState<string | null>(null);
  const [selectedInteractionId, setSelectedInteractionId] = useState<string | null>(null);

  const selectedPartner = useMemo(
    () => data.partners.find((partner) => partner.id === selectedPartnerId) ?? null,
    [data.partners, selectedPartnerId],
  );
  const selectedInteraction = useMemo(
    () =>
      selectedPartner?.interactions.find(
        (interaction) => interaction.id === selectedInteractionId,
      ) ?? null,
    [selectedInteractionId, selectedPartner?.interactions],
  );

  const funders = useMemo(
    () =>
      data.partners.map((funder) => ({
        ...funder,
        applications: applicationsForFunder(data.applications, funder),
      })),
    [data.applications, data.partners],
  );

  const filteredFunders = useMemo(() => {
    const query = searchQuery.toLowerCase();
    return funders.filter((funder) => {
      const applicationText = funder.applications
        .map((application) => `${application.roundName} ${application.status}`)
        .join(" ");
      const latestNote = funder.interactions[0]?.summary ?? "";
      const matchesSearch =
        !query ||
        funder.name.toLowerCase().includes(query) ||
        funder.focusAreas.toLowerCase().includes(query) ||
        funder.notes.toLowerCase().includes(query) ||
        latestNote.toLowerCase().includes(query) ||
        applicationText.toLowerCase().includes(query);
      const hasActiveGrant = funder.applications.some((application) =>
        ["draft", "submitted", "in_review", "shortlisted"].includes(application.status),
      );
      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "active" && hasActiveGrant) ||
        (statusFilter === "relationship" && funder.interactions.length > 0) ||
        (statusFilter === "no_notes" && funder.interactions.length === 0);
      return matchesSearch && matchesStatus;
    });
  }, [funders, searchQuery, statusFilter]);

  function openInteraction(partnerId: string, interactionId: string | null = null) {
    setSelectedPartnerId(partnerId);
    setSelectedInteractionId(interactionId);
    setInteractionDialogOpen(true);
  }

  function openDelete(partnerId: string, interactionId: string) {
    setSelectedPartnerId(partnerId);
    setSelectedInteractionId(interactionId);
    setDeleteDialogOpen(true);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-navy-blue">Funder relationships</h2>
          <p className="mt-1 text-sm text-slate-600">
            Track funder contacts, dated conversations, grant history, and follow-up actions.
          </p>
        </div>
        <Button
          className="gap-2 bg-orange-600 font-bold text-white hover:bg-orange-700"
          disabled={!canEditOrgProfile}
          type="button"
          onClick={() => setAddFunderOpen(true)}
        >
          <Plus className="size-4" />
          Add funder
        </Button>
      </div>

      <Card className="shadow-soft">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Handshake className="size-5 text-olea-green" />
            Mini CRM
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="flex flex-wrap items-center gap-3 border-b border-slate-100 bg-slate-50/50 p-3">
            <div className="relative min-w-[220px] flex-1">
              <Search className="absolute left-3 top-3 size-4 text-slate-400" />
              <Input
                className="pl-9"
                placeholder="Search funders, grants, notes, or contacts"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full bg-white md:w-[220px]">
                <SelectValue placeholder="All funders" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All funders</SelectItem>
                <SelectItem value="active">With active grants</SelectItem>
                <SelectItem value="relationship">With CRM notes</SelectItem>
                <SelectItem value="no_notes">Needs notes</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Funder</TableHead>
                  <TableHead>Related grants</TableHead>
                  <TableHead>Latest CRM note</TableHead>
                  <TableHead>Next action</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredFunders.length ? (
                  filteredFunders.map((funder) => {
                    const latestInteraction = funder.interactions[0] ?? null;
                    return (
                      <TableRow key={funder.id} className="align-top">
                        <TableCell className="min-w-[220px]">
                          <p className="font-semibold text-slate-900">{funder.name}</p>
                          <p className="mt-1 text-xs text-slate-500">
                            {funder.contactName} - {funder.email}
                          </p>
                          <Badge className="mt-2 bg-emerald-100 text-emerald-800">
                            {funder.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="min-w-[260px] text-sm text-slate-600">
                          {funder.applications.length ? (
                            <div className="space-y-2">
                              {funder.applications.map((application) => (
                                <div key={application.id}>
                                  <p className="font-medium text-slate-800">
                                    {application.roundName}
                                  </p>
                                  <p className="text-xs text-slate-500">
                                    {application.status} -{" "}
                                    {formatCurrency(application.requestedAmountCents)}
                                  </p>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <span className="text-slate-500">{funder.focusAreas}</span>
                          )}
                        </TableCell>
                        <TableCell className="min-w-[280px] text-sm text-slate-600">
                          {latestInteraction ? (
                            <div>
                              <p className="font-medium text-slate-800">
                                {formatDate(latestInteraction.interactionDate)} -{" "}
                                {contactMethodLabel(latestInteraction.contactMethod)}
                              </p>
                              <p className="mt-1 line-clamp-2">
                                {latestInteraction.summary}
                              </p>
                            </div>
                          ) : (
                            <span className="text-slate-500">No CRM notes yet.</span>
                          )}
                        </TableCell>
                        <TableCell className="min-w-[220px] text-sm text-slate-600">
                          {latestInteraction?.nextAction || "No next action set."}
                          {latestInteraction?.followUpDate ? (
                            <p className="mt-1 text-xs text-slate-500">
                              Follow up {formatDate(latestInteraction.followUpDate)}
                            </p>
                          ) : null}
                        </TableCell>
                        <TableCell className="min-w-[160px] text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              aria-label={`Add CRM note for ${funder.name}`}
                              disabled={!canEditOrgProfile}
                              size="icon"
                              type="button"
                              variant="outline"
                              onClick={() => openInteraction(funder.id)}
                            >
                              <Plus className="size-4" />
                            </Button>
                            {latestInteraction ? (
                              <>
                                <Button
                                  aria-label={`Edit latest CRM note for ${funder.name}`}
                                  disabled={!canEditOrgProfile}
                                  size="icon"
                                  type="button"
                                  variant="outline"
                                  onClick={() =>
                                    openInteraction(funder.id, latestInteraction.id)
                                  }
                                >
                                  <Edit3 className="size-4" />
                                </Button>
                                <Button
                                  aria-label={`Delete latest CRM note for ${funder.name}`}
                                  disabled={!canEditOrgProfile}
                                  size="icon"
                                  type="button"
                                  variant="outline"
                                  onClick={() => openDelete(funder.id, latestInteraction.id)}
                                >
                                  <Trash2 className="size-4" />
                                </Button>
                              </>
                            ) : null}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                ) : (
                  <TableRow>
                    <TableCell colSpan={5} className="py-10 text-center text-sm text-slate-500">
                      No funder relationships match your filters.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <FunderRelationshipDialog
        canEditOrgProfile={canEditOrgProfile}
        open={addFunderOpen}
        onOpenChange={setAddFunderOpen}
      />
      <FunderInteractionDialog
        canEditOrgProfile={canEditOrgProfile}
        interaction={selectedInteraction}
        open={interactionDialogOpen}
        partner={selectedPartner}
        onOpenChange={setInteractionDialogOpen}
      />
      <DeleteInteractionDialog
        canEditOrgProfile={canEditOrgProfile}
        interaction={selectedInteraction}
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
      />
    </div>
  );
}
