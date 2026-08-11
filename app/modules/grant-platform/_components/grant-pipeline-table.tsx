"use client";

import {
  AlertTriangle,
  Calendar,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  FileCheck,
  FileText,
  Paperclip,
  Plus,
  Send,
  Sparkles,
  Users,
} from "lucide-react";
import { useState } from "react";

import { AddGrantDialog } from "@/app/modules/grant-platform/_components/add-grant-dialog";
import { RequestWriterDialog } from "@/app/modules/grant-platform/_components/request-writer-dialog";
import { ApplicationWorkflowDialog } from "@/app/modules/grant-platform/_components/grant-platform-workspace";
import { updateGrantPlatformApplicationStatus } from "@/app/modules/grant-platform/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

import type { GrantPlatformWorkspaceData } from "@/lib/data/grant-platform";

interface GrantPipelineTableProps {
  canEditGrants: boolean;
  data: GrantPlatformWorkspaceData;
  onSwitchTab: (tab: string) => void;
}

export function GrantPipelineTable({ canEditGrants, data, onSwitchTab }: GrantPipelineTableProps) {
  const [expandedId, setExpandedId] = useState<string | null>("grant-1");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [submissionModalOpen, setSubmissionModalOpen] = useState(false);
  const [portalModalOpen, setPortalModalOpen] = useState(false);
  const [activeGrantForSubmission, setActiveGrantForSubmission] = useState<string | null>(null);
  const [confirmationNumber, setConfirmationNumber] = useState("");
  const [submissionSuccessMsg, setSubmissionSuccessMsg] = useState<string | null>(null);
  const [statusMessages, setStatusMessages] = useState<Record<string, string>>({});
  const [postedNotes, setPostedNotes] = useState<Record<string, Array<{ author: string; date: string; text: string }>>>({
    "grant-1": [
      { author: "Sarah Chen", date: "Today, 2:30pm", text: "First draft of problem statement ready. Waiting on youth testimonials by Friday." },
      { author: "Mike Rodriguez", date: "Yesterday, 10am", text: "Community Arts Centre confirmed - strong alignment with their 2026 priorities!" },
    ],
  });
  const [newNoteText, setNewNoteText] = useState("");

  // Map backend application data to grant rows
  const grantsList = [
    {
      id: "grant-1",
      name: "BC Community Gaming Grant - Arts",
      funder: "Province of BC",
      funderFocus: "Public benefit, community-led arts programming",
      status: "in_progress",
      requested: "$50,000",
      awarded: "-",
      deadline: "Apr 30, 2026",
      daysAway: "67 days away",
      progress: "65%",
      coachingStage: "Drafting",
      collaborators: [
        { name: "Community Arts Centre", role: "Partner", status: "Confirmed" },
        { name: "Sarah Chen", role: "Grant Writer", status: "Active" },
      ],
      files: [
        { name: "BC Gaming Grant Guidelines.pdf", date: "uploaded Jan 15" },
        { name: "Logic Model - DRAFT.xlsx", date: "uploaded Jan 18" },
        { name: "Community Arts Centre Letter.pdf", date: "uploaded Jan 20" },
      ],
    },
    {
      id: "grant-2",
      name: "Arts Futures Fund",
      funder: "Arts Council of BC",
      funderFocus: "Artistic innovation and creative expression",
      status: "planning",
      requested: "$35,000",
      awarded: "-",
      deadline: "May 15, 2026",
      daysAway: "82 days away",
      progress: "20%",
      coachingStage: "Planning",
      collaborators: [{ name: "Arts Council Advisory", role: "Advisor", status: "Assigned" }],
      files: [{ name: "Arts Futures Guidelines 2026.pdf", date: "uploaded Feb 01" }],
    },
    {
      id: "grant-3",
      name: "Youth Leadership Initiative",
      funder: "Community Foundation",
      funderFocus: "Youth empowerment and leadership skills",
      status: "approved",
      requested: "$45,000",
      awarded: "$42,000 (93%)",
      deadline: "Dec 20, 2025",
      daysAway: "Awarded",
      progress: "100%",
      awardDate: "Dec 20, 2025",
      postAwardReports: [
        { name: "Interim Report", status: "Pending", due: "Jun 20, 2026" },
        { name: "Final Report", status: "Pending", due: "Dec 20, 2026" },
      ],
      compliance: [
        { title: "Funder acknowledgment in program materials", done: true, note: "Completed: Jan 5, 2026" },
        { title: "Mid-year check-in call with funder", done: false, note: "Due: Jun 15, 2026" },
        { title: "Outcome data collection", done: false, note: "Due: Oct 31, 2026" },
        { title: "Final financial report", done: false, note: "Due: Dec 10, 2026" },
      ],
      collaborators: [{ name: "Leadership Committee", role: "Execution", status: "Active" }],
      files: [
        { name: "Signed Funding Agreement.pdf", date: "uploaded Dec 22" },
        { name: "Final Grant Narrative.pdf", date: "uploaded Dec 18" },
      ],
    },
    {
      id: "grant-4",
      name: "Health & Wellness Program Grant",
      funder: "Provincial Health Ministry",
      funderFocus: "Community health initiatives",
      status: "declined",
      requested: "$65,000",
      awarded: "-",
      deadline: "Sep 30, 2025",
      daysAway: "Decision: Nov 15, 2025",
      progress: "0%",
      declineReason:
        "Government funding threshold exceeded. Guidelines state max 75% government funding per program. Your program was at 76%.",
      learningNote: "Reduce government funding dependency. Could reapply next cycle if we diversify funding.",
      collaborators: [],
      files: [{ name: "Application Submission Copy.pdf", date: "uploaded Sep 29" }],
    },
  ];

  const filteredGrants = grantsList.filter((grant) => {
    const matchesSearch =
      grant.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      grant.funder.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || grant.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "planning":
        return <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100">Planning</Badge>;
      case "in_progress":
        return <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">In Progress</Badge>;
      case "applied":
        return <Badge className="bg-purple-100 text-purple-800 hover:bg-purple-100">Applied</Badge>;
      case "approved":
        return <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100">Approved</Badge>;
      case "declined":
        return <Badge className="bg-rose-100 text-rose-800 hover:bg-rose-100">Declined</Badge>;
      default:
        return <Badge className="bg-slate-100 text-slate-800">{status}</Badge>;
    }
  };

  const handlePostNote = (grantId: string) => {
    if (!newNoteText.trim()) return;
    setPostedNotes((prev) => ({
      ...prev,
      [grantId]: [
        ...(prev[grantId] || []),
        {
          author: "Grant Manager",
          date: "Just now",
          text: newNoteText.trim(),
        },
      ],
    }));
    setNewNoteText("");
  };

  const handleRecordSubmissionSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!confirmationNumber.trim()) return;

    setSubmissionSuccessMsg(
      `GRANT SUBMISSION RECORDED!\nFunder Confirmation #: ${confirmationNumber.trim()}\nStatus changed to: Applied.`
    );
    setTimeout(() => {
      setSubmissionModalOpen(false);
      setSubmissionSuccessMsg(null);
      setConfirmationNumber("");
    }, 2000);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-2xl font-bold text-navy-blue">Grant Pipeline</h2>
        <div className="flex flex-wrap items-center gap-2">
          {canEditGrants ? <AddGrantDialog /> : null}
          <Button
            type="button"
            className="bg-olea-green text-white hover:bg-olea-green/90"
            onClick={() => onSwitchTab("partners")}
          >
            Add Partner
          </Button>
          <ApplicationWorkflowDialog data={data} />
          <RequestWriterDialog />
          <Button
            type="button"
            variant="outline"
            className="bg-slate-100 text-slate-800"
            onClick={() => window.print()}
          >
            Export Board Report
          </Button>
        </div>
      </div>

      {/* Filter and Search Toolbar */}
      <div className="flex flex-wrap items-center gap-3 rounded-lg border border-slate-200 bg-white p-3 shadow-soft">
        <div className="flex-1 min-w-[200px]">
          <Input
            placeholder="Search grants or funders..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-9"
          />
        </div>
        <div className="w-[180px]">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="h-9">
              <SelectValue placeholder="All Statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="planning">Planning</SelectItem>
              <SelectItem value="in_progress">In Progress</SelectItem>
              <SelectItem value="applied">Applied</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="declined">Declined</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Grant Pipeline Table */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-soft">
        <div className="grid grid-cols-[2.5fr_1.5fr_1.2fr_1fr_1fr_1.2fr] bg-navy-blue px-4 py-3 text-xs font-semibold uppercase tracking-wider text-white">
          <div>Grant Name</div>
          <div>Funder</div>
          <div>Status</div>
          <div>Requested</div>
          <div>Awarded</div>
          <div>Deadline</div>
        </div>

        <div className="divide-y divide-slate-100">
          {filteredGrants.map((grant) => {
            const isExpanded = expandedId === grant.id;
            return (
              <div key={grant.id} className="transition-colors hover:bg-slate-50/50">
                <div
                  className="grid grid-cols-[2.5fr_1.5fr_1.2fr_1fr_1fr_1.2fr] items-center cursor-pointer px-4 py-3.5 text-sm"
                  onClick={() => setExpandedId(isExpanded ? null : grant.id)}
                >
                  <div className="flex items-center gap-2 font-medium text-slate-900">
                    {isExpanded ? (
                      <ChevronDown className="size-4 shrink-0 text-slate-400" />
                    ) : (
                      <ChevronRight className="size-4 shrink-0 text-slate-400" />
                    )}
                    <span>{grant.name}</span>
                  </div>
                  <div className="text-slate-600">{grant.funder}</div>
                  <div>{getStatusBadge(grant.status)}</div>
                  <div className="font-semibold text-slate-700">{grant.requested}</div>
                  <div className="font-medium text-slate-600">{grant.awarded}</div>
                  <div className="font-semibold text-orange-600">{grant.deadline}</div>
                </div>

                {/* Expanded Details Panel */}
                {isExpanded ? (
                  <div className="border-t border-slate-100 bg-slate-50/80 p-5 space-y-6">
                    {/* Section 1: Overview & Status Change */}
                    <div className="rounded-lg border border-slate-200 bg-white p-4 space-y-3">
                      <h3 className="text-base font-bold text-navy-blue">Grant Overview</h3>
                      <div className="grid gap-2 text-sm text-slate-700 md:grid-cols-2">
                        <p>
                          <strong>Funder:</strong> {grant.funder}
                        </p>
                        <p>
                          <strong>Amount Requested:</strong> {grant.requested}
                        </p>
                        {grant.funderFocus ? (
                          <p className="md:col-span-2">
                            <strong>Funder Focus:</strong> {grant.funderFocus}
                          </p>
                        ) : null}
                        {grant.awarded !== "-" ? (
                          <p>
                            <strong>Amount Awarded:</strong> {grant.awarded}
                          </p>
                        ) : null}
                        <p>
                          <strong>Deadline:</strong> {grant.deadline} ({grant.daysAway})
                        </p>
                        {grant.progress ? (
                          <p>
                            <strong>Progress:</strong> {grant.progress} complete
                          </p>
                        ) : null}
                      </div>

                      <div className="mt-3 rounded-lg border border-olea-green/30 bg-olea-light/40 p-3 space-y-2">
                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-800">
                          Change Status:
                        </label>
                        <div className="flex flex-wrap items-center gap-2">
                          <div className="w-[180px]">
                            <Select
                              defaultValue={grant.status}
                              onValueChange={(val) => {
                                setStatusMessages((prev) => ({
                                  ...prev,
                                  [grant.id]: `Status updated to ${val}. Team notified.`,
                                }));
                              }}
                            >
                              <SelectTrigger className="h-9 font-semibold text-slate-900 bg-white border-olea-green">
                                <SelectValue placeholder="Select status" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="planning">Planning</SelectItem>
                                <SelectItem value="in_progress">In Progress</SelectItem>
                                <SelectItem value="applied">Applied</SelectItem>
                                <SelectItem value="approved">Approved</SelectItem>
                                <SelectItem value="declined">Declined</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <span className="text-xs text-slate-500">Status changes instantly • Team is notified</span>
                        </div>
                        {statusMessages[grant.id] ? (
                          <p className="text-xs font-medium text-olea-green">{statusMessages[grant.id]}</p>
                        ) : null}
                      </div>
                    </div>

                    {/* Section 2: Stage Specific Coaching Box */}
                    {grant.status === "in_progress" || grant.status === "planning" ? (
                      <div className="rounded-lg border-l-4 border-olea-green bg-white p-4 shadow-soft space-y-2">
                        <h3 className="flex items-center gap-2 text-sm font-bold text-slate-900">
                          <Sparkles className="size-4 text-olea-green" />
                          {grant.status === "in_progress"
                            ? "Draft Writing Coaching (Drafting Stage)"
                            : "Planning Stage Coaching"}
                        </h3>
                        {grant.status === "in_progress" ? (
                          <div className="space-y-1.5 text-xs leading-relaxed text-slate-700">
                            <p>
                              <strong>Problem Statement:</strong> Use data, not emotion. &quot;50% of youth lack mentorship
                              (source: 2025 Census)&quot;
                            </p>
                            <p>
                              <strong>Solution:</strong> Be specific. &quot;Matched 1:1 mentoring, 2 hrs/month, 12-month
                              commitment&quot;
                            </p>
                            <p>
                              <strong>Impact:</strong> Connect to funder priorities. &quot;This aligns with their focus on youth
                              development.&quot;
                            </p>
                            <div className="pt-2">
                              <RequestWriterDialog
                                grantName={grant.name}
                                trigger={
                                  <Button size="sm" className="bg-olea-green text-white hover:bg-olea-green/90">
                                    Express Interest in Writer Support
                                  </Button>
                                }
                              />
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-1 text-xs text-slate-700">
                            <p>• Research funder mission and past grants</p>
                            <p>• Read ALL guidelines carefully</p>
                            <p>• Assess fit: Is this 90%+ aligned?</p>
                            <p>• Define your unique angle</p>
                          </div>
                        )}
                      </div>
                    ) : null}

                    {/* Section 3: Pre-Submission Checklist (In Progress / Applied) */}
                    {grant.status === "in_progress" ? (
                      <div className="rounded-lg border-2 border-orange-400 bg-orange-50/50 p-4 space-y-3">
                        <h4 className="flex items-center gap-2 text-sm font-bold text-navy-blue">
                          <FileCheck className="size-4 text-orange-600" />
                          Pre-Submission Checklist
                        </h4>
                        <div className="grid gap-2 text-xs text-slate-700 md:grid-cols-2">
                          {[
                            "Problem statement reviewed and finalized",
                            "Budget complete and realistic",
                            "Letters of support collected",
                            "Logic model finalized",
                            "All sections reviewed by team",
                            "Spelling/grammar check complete",
                          ].map((checkItem) => (
                            <label key={checkItem} className="flex items-center gap-2 cursor-pointer">
                              <input type="checkbox" className="rounded border-slate-300 text-orange-600 focus:ring-orange-500" />
                              <span>{checkItem}</span>
                            </label>
                          ))}
                        </div>
                        <p className="text-xs text-slate-500">All required files uploaded below</p>
                        <div className="flex flex-wrap gap-2 pt-1">
                          <Button
                            size="sm"
                            type="button"
                            className="gap-2 bg-orange-600 text-white hover:bg-orange-700"
                            onClick={() => setPortalModalOpen(true)}
                          >
                            <ExternalLink className="size-3.5" />
                            Open Funder Portal
                          </Button>
                          <Button
                            size="sm"
                            type="button"
                            className="gap-2 bg-olea-green text-white hover:bg-olea-green/90"
                            onClick={() => {
                              setActiveGrantForSubmission(grant.name);
                              setSubmissionModalOpen(true);
                            }}
                          >
                            <CheckCircle2 className="size-3.5" />
                            Mark as Submitted
                          </Button>
                        </div>
                      </div>
                    ) : null}

                    {/* Section 4: Post-Award Management (Approved Grants) */}
                    {grant.status === "approved" ? (
                      <div className="rounded-lg border border-emerald-200 bg-emerald-50/40 p-4 space-y-4">
                        <div className="flex items-center justify-between">
                          <h4 className="flex items-center gap-2 text-sm font-bold text-emerald-900">
                            <CheckCircle2 className="size-4 text-emerald-600" />
                            Approved - Post-Award Management
                          </h4>
                          <span className="text-xs font-semibold text-emerald-700">Awarded: {grant.awardDate}</span>
                        </div>

                        {/* Report Deadlines */}
                        <div className="space-y-2">
                          <p className="text-xs font-bold uppercase tracking-wider text-slate-700">Report Deadlines</p>
                          <div className="grid gap-2 md:grid-cols-2">
                            {grant.postAwardReports?.map((report) => (
                              <div key={report.name} className="rounded border border-emerald-200 bg-white p-2.5 text-xs">
                                <div className="flex items-center justify-between">
                                  <span className="font-semibold text-slate-900">{report.name}</span>
                                  <Badge className="bg-orange-500 text-white">{report.status}</Badge>
                                </div>
                                <p className="mt-1 text-slate-500">Due: {report.due}</p>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Compliance Checklist */}
                        <div className="space-y-2">
                          <p className="text-xs font-bold uppercase tracking-wider text-slate-700">Compliance Checklist</p>
                          <div className="space-y-2 bg-white p-3 rounded border border-emerald-100">
                            {grant.compliance?.map((comp, idx) => (
                              <div key={idx} className="flex items-start gap-2.5 text-xs">
                                <input type="checkbox" defaultChecked={comp.done} className="mt-0.5 rounded text-emerald-600" />
                                <div>
                                  <p className="font-medium text-slate-800">{comp.title}</p>
                                  <p className={comp.done ? "text-emerald-700 font-semibold" : "text-slate-500"}>{comp.note}</p>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    ) : null}

                    {/* Section 5: Declined Reason & Lessons Learned */}
                    {grant.status === "declined" ? (
                      <div className="rounded-lg border-l-4 border-rose-600 bg-rose-50 p-4 space-y-2">
                        <h4 className="flex items-center gap-2 text-sm font-bold text-rose-900">
                          <AlertTriangle className="size-4 text-rose-600" />
                          Why It Was Declined & Lessons Learned
                        </h4>
                        <p className="text-xs font-medium text-rose-800">{grant.declineReason}</p>
                        <div className="rounded border border-rose-200 bg-white p-2.5 text-xs text-slate-700">
                          <strong>Learning for Next Time:</strong> {grant.learningNote}
                        </div>
                      </div>
                    ) : null}

                    {/* Section 6: Team Collaboration Notes */}
                    <div className="rounded-lg border border-slate-200 bg-white p-4 space-y-3">
                      <h4 className="flex items-center gap-2 text-sm font-bold text-navy-blue">
                        <Users className="size-4 text-olea-green" />
                        Team & Collaboration Updates
                      </h4>

                      <div className="space-y-2">
                        {(postedNotes[grant.id] || []).map((note, i) => (
                          <div key={i} className="rounded border border-slate-100 bg-slate-50 p-3 text-xs">
                            <div className="flex items-center justify-between text-slate-500">
                              <span className="font-bold text-slate-900">{note.author}</span>
                              <span>{note.date}</span>
                            </div>
                            <p className="mt-1 text-slate-700">{note.text}</p>
                          </div>
                        ))}
                      </div>

                      <div className="flex gap-2 pt-1">
                        <Input
                          placeholder="Write a team update..."
                          value={newNoteText}
                          onChange={(e) => setNewNoteText(e.target.value)}
                          className="h-9 text-xs"
                        />
                        <Button size="sm" type="button" onClick={() => handlePostNote(grant.id)}>
                          Post Update
                        </Button>
                      </div>
                    </div>

                    {/* Section 7: Files Attachment */}
                    <div className="rounded-lg border border-slate-200 bg-white p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <h4 className="flex items-center gap-2 text-sm font-bold text-navy-blue">
                          <Paperclip className="size-4 text-olea-green" />
                          Grant Files & Attachments
                        </h4>
                        <Button
                          size="sm"
                          variant="outline"
                          className="gap-1.5 text-xs"
                          onClick={() => alert("File upload modal initialized. Choose your document.")}
                        >
                          <Plus className="size-3.5" />
                          Upload File
                        </Button>
                      </div>
                      <div className="space-y-1.5 text-xs text-slate-700">
                        {grant.files.map((file) => (
                          <div key={file.name} className="flex items-center justify-between rounded border border-slate-100 p-2">
                            <span className="font-medium text-slate-800">{file.name}</span>
                            <span className="text-slate-400">{file.date}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      </div>

      {/* Portal Dialog Modal */}
      <Dialog open={portalModalOpen} onOpenChange={setPortalModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ExternalLink className="size-5 text-orange-600" />
              Open Funder Portal
            </DialogTitle>
            <DialogDescription>
              You are launching the official BC Community Gaming Grant Application Portal.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 text-xs text-slate-700">
            <p className="font-semibold text-slate-900">Submission Steps:</p>
            <ol className="list-decimal pl-4 space-y-1">
              <li>Log in to your funder portal account</li>
              <li>Select &quot;BC Community Gaming Grant&quot;</li>
              <li>Upload your finalized Problem Statement & Budget</li>
              <li>Submit application and copy your confirmation number</li>
              <li>Return to Olea and click &quot;Mark as Submitted&quot;</li>
            </ol>
          </div>
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setPortalModalOpen(false)}>
              Cancel
            </Button>
            <Button
              className="bg-orange-600 text-white hover:bg-orange-700"
              onClick={() => {
                window.open("https://grants.bc.ca/gaming", "_blank");
                setPortalModalOpen(false);
              }}
            >
              Launch Portal →
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Record Submission Dialog Modal */}
      <Dialog open={submissionModalOpen} onOpenChange={setSubmissionModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle2 className="size-5 text-olea-green" />
              Mark Grant as Submitted
            </DialogTitle>
            <DialogDescription>
              Record your official funder submission confirmation for {activeGrantForSubmission}.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleRecordSubmissionSubmit} className="space-y-4">
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-700">Funder Confirmation Number</label>
              <Input
                placeholder="e.g. BC-GAMING-2026-12345"
                value={confirmationNumber}
                onChange={(e) => setConfirmationNumber(e.target.value)}
                required
              />
            </div>
            {submissionSuccessMsg ? <p className="text-xs font-semibold text-olea-green">{submissionSuccessMsg}</p> : null}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setSubmissionModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" className="bg-olea-green text-white hover:bg-olea-green/90">
                Confirm Submission
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
