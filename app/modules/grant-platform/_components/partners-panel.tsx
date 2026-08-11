"use client";

import { HelpCircle, Trash2, Users } from "lucide-react";
import { useMemo, useState } from "react";
import { useFormState } from "react-dom";

import {
  deleteGrantPlatformPartner,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import type { GrantPlatformWorkspaceData } from "@/lib/data/grant-platform";

export function PartnerDialog({
  canEditOrgProfile,
  onOpenChange,
  open,
  partner,
}: {
  canEditOrgProfile: boolean;
  onOpenChange: (open: boolean) => void;
  open: boolean;
  partner: GrantPlatformWorkspaceData["partners"][number] | null;
}) {
  const [partnerState, partnerFormAction] = useFormState(saveGrantPlatformPartner, {
    message: "",
    success: false,
  });
  const [, deleteFormAction] = useFormState(deleteGrantPlatformPartner, {
    message: "",
    success: false,
  });
  const [partnerType, setPartnerType] = useState(partner?.partnerType ?? "Community Organization");
  const [partnerStatus, setPartnerStatus] = useState(partner?.status ?? "Active Collaborator");
  const title = partner ? "Edit Partner Details" : "Add Partner";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            Track organizations, institutions, and individuals who can collaborate on future grant opportunities.
          </DialogDescription>
        </DialogHeader>
        <form key={partner?.id ?? "new-partner"} id="partner-form" action={partnerFormAction} className="space-y-4">
          <input name="partnerId" type="hidden" value={partner?.id ?? ""} />
          <div className="grid gap-4 md:grid-cols-2">
            <label className="space-y-2 text-sm font-medium text-slate-700">
              Partner Name
              <Input disabled={!canEditOrgProfile} name="partnerName" placeholder="Organization or individual name" defaultValue={partner?.name ?? ""} />
            </label>
            <div className="space-y-2 text-sm font-medium text-slate-700">
              <label>Partner Type</label>
              <input type="hidden" name="partnerType" value={partnerType} />
              <Select disabled={!canEditOrgProfile} value={partnerType} onValueChange={setPartnerType}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select partner type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Community Organization">Community Organization</SelectItem>
                  <SelectItem value="Academic Institution">Academic Institution</SelectItem>
                  <SelectItem value="Government Agency">Government Agency</SelectItem>
                  <SelectItem value="Individual / Board Advisor">Individual / Board Advisor</SelectItem>
                  <SelectItem value="For-Profit Partner">For-Profit Partner</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <label className="space-y-2 text-sm font-medium text-slate-700">
              Name of primary contact
              <Input disabled={!canEditOrgProfile} name="partnerContact" placeholder="Name of primary contact" defaultValue={partner?.contactName ?? ""} />
            </label>
            <label className="space-y-2 text-sm font-medium text-slate-700">
              Email
              <Input disabled={!canEditOrgProfile} name="partnerEmail" placeholder="email@example.com" type="email" defaultValue={partner?.email ?? ""} />
            </label>
            <label className="space-y-2 text-sm font-medium text-slate-700">
              Phone
              <Input disabled={!canEditOrgProfile} name="partnerPhone" placeholder="(604) 555-0000" type="tel" defaultValue={partner?.phone ?? ""} />
            </label>
            <label className="space-y-2 text-sm font-medium text-slate-700 md:col-span-2">
              Focus Areas
              <Input disabled={!canEditOrgProfile} name="partnerFocus" placeholder="e.g., Arts, Culture, Youth Programs (comma-separated)" defaultValue={partner?.focusAreas ?? ""} />
            </label>
            <div className="space-y-2 text-sm font-medium text-slate-700 md:col-span-2">
              <label>Status</label>
              <input type="hidden" name="partnerStatus" value={partnerStatus} />
              <Select disabled={!canEditOrgProfile} value={partnerStatus} onValueChange={setPartnerStatus}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Active Collaborator">Active Collaborator</SelectItem>
                  <SelectItem value="Good for Evaluation">Good for Evaluation</SelectItem>
                  <SelectItem value="Strategic Partner">Strategic Partner</SelectItem>
                  <SelectItem value="Potential Collaborator">Potential Collaborator</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <label className="space-y-2 text-sm font-medium text-slate-700 md:col-span-2">
              <strong>Partner Notes & History</strong>
              <Textarea disabled={!canEditOrgProfile} name="partnerNotes" placeholder="Add notes about this partnership: what they're good at, collaboration history, key contacts, follow-up items, etc." defaultValue={partner?.notes ?? ""} className="min-h-[120px]" />
              <p className="text-xs text-slate-500">Use this space to track partnership history, what works well, challenges, and ideas for future collaboration.</p>
            </label>
            <label className="space-y-2 text-sm font-medium text-slate-700 md:col-span-2">
              Last collaboration
              <Input disabled={!canEditOrgProfile} name="partnerLastCollaboration" placeholder="Last collaborated: ..." defaultValue={partner?.lastCollaboration ?? ""} />
            </label>
          </div>
          <input name="partnerAddedNote" type="hidden" value={partner?.addedNote ?? ""} />
          {partnerState.message ? (
            <p className={`text-sm ${partnerState.success ? "text-olea-green" : "text-red-600"}`}>{partnerState.message}</p>
          ) : null}
        </form>
        <DialogFooter className="flex flex-col gap-2 sm:flex-row">
          {partner ? (
            <form action={deleteFormAction}>
              <input name="partnerId" type="hidden" value={partner.id} />
              <Button disabled={!canEditOrgProfile} type="submit" variant="destructive">
                <Trash2 className="mr-2 size-4" />
                Delete
              </Button>
            </form>
          ) : null}
          <Button disabled={!canEditOrgProfile} form="partner-form" type="submit">
            Save changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function PartnersPanel({
  canEditOrgProfile,
  data,
}: {
  canEditOrgProfile: boolean;
  data: GrantPlatformWorkspaceData;
}) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedPartnerId, setSelectedPartnerId] = useState<string | null>(null);
  const selectedPartner = useMemo(
    () => data.partners.find((partner) => partner.id === selectedPartnerId) ?? null,
    [data.partners, selectedPartnerId],
  );

  return (
    <div className="space-y-5">
      <Card className="shadow-soft">
        <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Users className="size-5 text-olea-green" />
            Partners & Collaborators
          </CardTitle>
          <div className="group relative">
            <button
              type="button"
              className="grid size-7 place-items-center rounded-full bg-slate-100 text-slate-600 transition hover:bg-olea-green hover:text-white"
              aria-label="How to use partners"
            >
              <HelpCircle className="size-4" />
            </button>
            <div className="pointer-events-none absolute right-0 top-9 z-30 w-80 scale-95 rounded-xl border border-slate-200 bg-white p-4 shadow-xl opacity-0 transition-all duration-150 group-hover:pointer-events-auto group-hover:scale-100 group-hover:opacity-100">
              <p className="mb-2 font-bold text-slate-900 text-xs">How to Use This</p>
              <div className="space-y-2 text-xs text-slate-600">
                <p><strong>Track Potential Partners:</strong> Add organizations you want to collaborate with on future grants.</p>
                <p><strong>Note Their Strengths:</strong> Document what they&apos;re good at (evaluation, community reach, research, etc.).</p>
                <p><strong>Keep Contact Info:</strong> Store emails and contacts in one place.</p>
                <p><strong>Reference When Planning Grants:</strong> When researching new opportunities, check here to see which partners might be a good fit.</p>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-center justify-between gap-4 mb-5">
            <p className="text-sm text-slate-600">Track organizations, institutions, and individuals who can collaborate on future grant opportunities.</p>
            <Button
              className="bg-olea-green text-white hover:bg-olea-green/90"
              disabled={!canEditOrgProfile}
              onClick={() => {
                setSelectedPartnerId(null);
                setDialogOpen(true);
              }}
            >
              + Add Partner
            </Button>
          </div>

          {/* Partners Data Table */}
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-soft">
            <Table>
              <TableHeader className="bg-slate-100/70">
                <TableRow>
                  <TableHead className="w-[220px]">Partner Name</TableHead>
                  <TableHead className="w-[180px]">Type</TableHead>
                  <TableHead className="w-[200px]">Primary Contact & Email</TableHead>
                  <TableHead>Focus Areas</TableHead>
                  <TableHead className="w-[150px]">Status</TableHead>
                  <TableHead className="w-[100px] text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.partners.length ? (
                  data.partners.map((partner) => (
                    <TableRow
                      key={partner.id}
                      className="cursor-pointer hover:bg-slate-50/80"
                      onClick={() => {
                        setSelectedPartnerId(partner.id);
                        setDialogOpen(true);
                      }}
                    >
                      <TableCell className="font-semibold text-slate-900 text-xs">
                        {partner.name}
                      </TableCell>
                      <TableCell className="text-xs text-slate-600">
                        <Badge variant="outline" className="bg-slate-50 text-slate-700">
                          {partner.partnerType}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-slate-600 space-y-0.5">
                        <p className="font-medium text-slate-800">{partner.contactName}</p>
                        <p className="text-slate-500">{partner.email}</p>
                      </TableCell>
                      <TableCell className="text-xs text-slate-600">
                        {partner.focusAreas}
                      </TableCell>
                      <TableCell>
                        <Badge className="bg-emerald-100 font-bold text-emerald-800 text-[11px]">
                          {partner.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 text-xs text-slate-700"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedPartnerId(partner.id);
                            setDialogOpen(true);
                          }}
                        >
                          Edit
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} className="py-8 text-center text-xs text-slate-500">
                      No partners recorded yet. Click &quot;+ Add Partner&quot; to register your first partner organization.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <PartnerDialog canEditOrgProfile={canEditOrgProfile} onOpenChange={setDialogOpen} open={dialogOpen} partner={selectedPartner} />
    </div>
  );
}
