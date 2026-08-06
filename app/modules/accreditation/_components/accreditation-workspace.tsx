"use client";

import {
  AlertTriangle,
  CheckCircle2,
  ClipboardCheck,
  FileCheck2,
  FileDown,
  FileText,
  FolderOpen,
  LayoutDashboard,
  Loader2,
  Paperclip,
  Save,
  Settings,
} from "lucide-react";
import {
  type Dispatch,
  type ReactNode,
  type SetStateAction,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";
import { useRouter } from "next/navigation";

import {
  saveAccreditationSettingsAction,
  saveAccreditationTemplateAction,
  type AccreditationActionResult,
} from "@/app/modules/accreditation/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import type {
  AccreditationDocumentMode,
  AccreditationTemplateDefinition,
  AccreditationTemplateResponse,
  AccreditationWorkspaceData,
} from "@/lib/accreditation/types";
import {
  emptyResponse,
  isResponseComplete,
  mergeResponse,
} from "@/lib/accreditation/domain";

const tabs = ["dashboard", "library", "editor", "settings"] as const;
type AccreditationTab = (typeof tabs)[number];

const teamRoleOptions = [
  "Board Chair",
  "Executive Director",
  "Treasurer / Finance Lead",
  "HR Lead",
  "Fundraising Lead",
  "Volunteer Manager",
  "Governance Committee",
];

export function AccreditationWorkspace({
  activeTab,
  activeTemplateCode,
  data,
}: {
  activeTab?: string;
  activeTemplateCode?: string;
  data: AccreditationWorkspaceData;
}) {
  const router = useRouter();
  const initialTab = resolveTab(activeTab, data.configured);
  const [tab, setTab] = useState<AccreditationTab>(initialTab);
  const [isConfigured, setIsConfigured] = useState(data.configured);
  const [responses, setResponses] = useState(data.responses);
  const [isExporting, setIsExporting] = useState(false);
  const [exportError, setExportError] = useState("");
  const [selectedCode, setSelectedCode] = useState(
    data.templates.some((template) => template.code === activeTemplateCode)
      ? activeTemplateCode!
      : data.templates[0]?.code ?? "A1",
  );

  const selectedTemplate =
    data.templates.find((template) => template.code === selectedCode) ??
    data.templates[0];
  const selectedResponse =
    responses.find((response) => response.templateId === selectedTemplate.code) ??
    emptyResponse(selectedTemplate.code);
  const workspace = useMemo(
    () => ({ ...data, configured: isConfigured, responses }),
    [data, isConfigured, responses],
  );

  useEffect(() => {
    setIsConfigured(data.configured);
  }, [data.configured]);

  function changeTab(value: string) {
    const next = resolveTab(value, isConfigured);
    setTab(next);
    router.replace(`/modules/accreditation?tab=${next}`, { scroll: false });
  }

  function openTemplate(templateCode: string) {
    setSelectedCode(templateCode);
    setTab("editor");
    router.replace(`/modules/accreditation?tab=editor&template=${templateCode}`, {
      scroll: false,
    });
  }

  async function handleExportPdf() {
    setIsExporting(true);
    setExportError("");

    try {
      const response = await fetch("/api/accreditation/export", {
        credentials: "include",
      });
      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(body?.error ?? "Unable to generate the accreditation report right now.");
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      const disposition = response.headers.get("content-disposition");
      const fileName = disposition?.match(/filename="([^"]+)"/)?.[1] ?? "accreditation-preparation-workspace.pdf";
      anchor.href = url;
      anchor.download = fileName;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
    } catch (error) {
      setExportError(
        error instanceof Error ? error.message : "Unable to generate the accreditation report right now.",
      );
    } finally {
      setIsExporting(false);
    }
  }

  return (
    <section className="space-y-5" data-testid="accreditation-workspace">
      <header className="rounded-2xl border bg-gradient-to-br from-white to-olea-light/50 p-6 shadow-soft">
        <Badge className="bg-white text-olea-green shadow-sm">Accreditation</Badge>
        <div className="mt-5 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="text-4xl font-bold tracking-tight text-slate-950">
              Accreditation Preparation Workspace
            </h1>
            <p className="mt-3 max-w-3xl text-lg leading-8 text-slate-600">
              Organize Imagine Canada evidence, draft missing documents, track
              board approvals, and see submission readiness in one workspace.
            </p>
          </div>
          <div className="flex flex-col items-start gap-3 lg:items-end">
            <Button
              aria-label="Export accreditation workspace as PDF"
              disabled={isExporting}
              onClick={() => void handleExportPdf()}
              type="button"
              variant="outline"
            >
              {isExporting ? (
                <Loader2 className="mr-2 size-4 animate-spin" />
              ) : (
                <FileDown className="mr-2 size-4" />
              )}
              {isExporting ? "Preparing PDF..." : "Print / Save PDF"}
            </Button>
            {exportError ? (
              <p className="max-w-xs text-right text-sm text-red-700">{exportError}</p>
            ) : null}
            <ProgressRing
              percent={completionPercent(workspace.responses, workspace.totals.total)}
            />
          </div>
        </div>
      </header>

      <Tabs data-testid="accreditation-tabs" value={tab} onValueChange={changeTab}>
        <div className="rounded-xl border bg-white p-3 shadow-soft">
          <TabsList className="h-auto w-full flex-wrap justify-start gap-1 bg-olea-light/50">
            <TabsTrigger value="dashboard" className="gap-2 px-4 py-3">
              <LayoutDashboard className="size-4" />
              Dashboard
            </TabsTrigger>
            <TabsTrigger value="library" className="gap-2 px-4 py-3">
              <FolderOpen className="size-4" />
              Template Library
            </TabsTrigger>
            <TabsTrigger value="editor" className="gap-2 px-4 py-3">
              <FileText className="size-4" />
              Template Editor
            </TabsTrigger>
            <TabsTrigger value="settings" className="gap-2 px-4 py-3">
              <Settings className="size-4" />
              Settings
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="dashboard">
          <DashboardTab
            data={workspace}
            onOpenTemplate={openTemplate}
            responses={responses}
          />
        </TabsContent>
        <TabsContent value="library">
          <LibraryTab
            data={workspace}
            onOpenTemplate={openTemplate}
            responses={responses}
          />
        </TabsContent>
        <TabsContent value="editor">
          <EditorTab
            response={selectedResponse}
            setResponses={setResponses}
            template={selectedTemplate}
            templates={data.templates}
            onSelectTemplate={(code) => {
              setSelectedCode(code);
              router.replace(`/modules/accreditation?tab=editor&template=${code}`, {
                scroll: false,
              });
            }}
          />
        </TabsContent>
        <TabsContent value="settings">
          <SettingsTab
            data={workspace}
            onSaved={() => {
              setIsConfigured(true);
              setTab("dashboard");
              router.replace("/modules/accreditation?tab=dashboard", {
                scroll: false,
              });
            }}
          />
        </TabsContent>
      </Tabs>
    </section>
  );
}

function DashboardTab({
  data,
  onOpenTemplate,
  responses,
}: {
  data: AccreditationWorkspaceData;
  onOpenTemplate: (templateCode: string) => void;
  responses: AccreditationTemplateResponse[];
}) {
  const nextTemplates = data.templates
    .filter((template) => {
      const response = responses.find((item) => item.templateId === template.code);
      return !response || !isResponseComplete(response);
    })
    .slice(0, 5);

  return (
    <div className="space-y-5">
      {!data.configured ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-amber-900">
          <p className="font-semibold">Start in Settings</p>
          <p className="mt-1 text-sm">
            Confirm your organization details before preparing accreditation
            documents. This keeps every document session tied to the right
            submission context.
          </p>
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Templates complete"
          testId="accreditation-templates-complete"
          value={`${completedCount(responses)} / ${data.totals.total}`}
        />
        <MetricCard label="Board approvals needed" value={data.totals.boardApprovalNeeded.toString()} />
        <MetricCard label="Ready for board" value={responses.filter((item) => item.approvalStatus === "ready_for_board").length.toString()} />
        <MetricCard label="Board approved" value={responses.filter((item) => item.approvalStatus === "board_approved").length.toString()} />
      </div>

      <div className="grid gap-4 lg:grid-cols-5">
        {data.sections.map((section) => (
          <Card key={section.id}>
            <CardContent className="p-5">
              <p className="text-sm font-bold uppercase tracking-[0.16em] text-olea-green">
                Section {section.id}
              </p>
              <h3 className="mt-2 text-lg font-bold text-slate-900">
                {section.name}
              </h3>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                {section.description}
              </p>
              <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full bg-olea-green"
                  style={{
                    width: `${Math.round((section.completed / section.total) * 100)}%`,
                  }}
                />
              </div>
              <p className="mt-2 text-sm font-semibold text-slate-600">
                {section.completed} of {section.total} complete
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardContent className="p-5">
          <h2 className="text-xl font-bold text-slate-950">Next documents to finish</h2>
          <div className="mt-4 divide-y rounded-xl border">
            {nextTemplates.length ? (
              nextTemplates.map((template) => (
                <button
                  key={template.code}
                  className="flex w-full items-center justify-between gap-4 p-4 text-left transition hover:bg-olea-light/40"
                  onClick={() => onOpenTemplate(template.code)}
                  type="button"
                >
                  <span>
                    <span className="font-bold text-slate-900">
                      {template.code} · {template.title}
                    </span>
                    <span className="block text-sm text-slate-500">
                      {template.icRequirement}
                    </span>
                  </span>
                  <Badge variant="outline">{template.kind}</Badge>
                </button>
              ))
            ) : (
              <div className="p-8 text-center text-slate-500">
                All documents have a completion record.
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function LibraryTab({
  data,
  onOpenTemplate,
  responses,
}: {
  data: AccreditationWorkspaceData;
  onOpenTemplate: (templateCode: string) => void;
  responses: AccreditationTemplateResponse[];
}) {
  return (
    <div className="space-y-5">
      {data.sections.map((section) => {
        const sectionTemplates = data.templates.filter(
          (template) => template.sectionId === section.id,
        );
        return (
          <Card key={section.id}>
            <CardContent className="p-5">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="text-sm font-bold uppercase tracking-[0.16em] text-olea-green">
                    Section {section.id}
                  </p>
                  <h2 className="text-2xl font-bold text-slate-950">
                    {section.name}
                  </h2>
                </div>
                <Badge variant="outline">{sectionTemplates.length} templates</Badge>
              </div>
              <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {sectionTemplates.map((template) => {
                  const response =
                    responses.find((item) => item.templateId === template.code) ??
                    emptyResponse(template.code);
                  const complete = isResponseComplete(response);
                  return (
                    <button
                      key={template.code}
                      className="rounded-xl border bg-white p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-olea-green hover:shadow-soft"
                      onClick={() => onOpenTemplate(template.code)}
                      type="button"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <span className="rounded-lg bg-olea-light px-2.5 py-1 text-sm font-bold text-olea-green">
                          {template.code}
                        </span>
                        {complete ? (
                          <CheckCircle2 className="size-5 text-olea-green" />
                        ) : (
                          <FileText className="size-5 text-slate-400" />
                        )}
                      </div>
                      <h3 className="mt-4 font-bold text-slate-900">
                        {template.title}
                      </h3>
                      <p className="mt-2 line-clamp-3 text-sm leading-6 text-slate-500">
                        {template.icRequirement}
                      </p>
                      <div className="mt-4 flex flex-wrap gap-2">
                        <Badge variant="outline">{template.kind}</Badge>
                        {template.boardApprovalRequired ? (
                          <Badge className="bg-amber-100 text-amber-900">
                            Board approval
                          </Badge>
                        ) : null}
                      </div>
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

function EditorTab({
  onSelectTemplate,
  response,
  setResponses,
  template,
  templates,
}: {
  onSelectTemplate: (templateCode: string) => void;
  response: AccreditationTemplateResponse;
  setResponses: Dispatch<SetStateAction<AccreditationTemplateResponse[]>>;
  template: AccreditationTemplateDefinition;
  templates: AccreditationTemplateDefinition[];
}) {
  const router = useRouter();
  const [draft, setDraft] = useState(response);
  const draftRef = useRef(response);
  const [state, setState] = useState<AccreditationActionResult>({ ok: true });
  const [pending, startTransition] = useTransition();

  function updateDraft(next: Partial<AccreditationTemplateResponse>) {
    const updated = { ...draftRef.current, ...next };
    draftRef.current = updated;
    setDraft(updated);
  }

  useEffect(() => {
    draftRef.current = response;
    setDraft(response);
    setState({ ok: true });
  }, [response.templateId]);

  function submit(formData: FormData) {
    const currentDraft = draftRef.current;
    setState({ ok: true });
    formData.set("templateId", template.code);
    formData.set("documentMode", currentDraft.documentMode);
    formData.set(
      "approvalStatus",
      template.boardApprovalRequired ? currentDraft.approvalStatus : "not_required",
    );
    formData.set("evidenceName", currentDraft.evidenceName);
    formData.set("evidenceLocation", currentDraft.evidenceLocation);
    formData.set("textDraft", currentDraft.textDraft);
    formData.set("notes", currentDraft.notes);
    startTransition(async () => {
      const result = await saveAccreditationTemplateAction(formData);
      setState(result);
      if (result.ok) {
        const savedResponse =
          result.response ??
          mergeResponse([], {
            approvalStatus: template.boardApprovalRequired
              ? currentDraft.approvalStatus
              : "not_required",
            documentMode: currentDraft.documentMode,
            evidenceFile: currentDraft.evidenceFile,
            evidenceLocation: currentDraft.evidenceLocation,
            evidenceName: currentDraft.evidenceName,
            notes: currentDraft.notes,
            templateId: template.code,
            textDraft: currentDraft.textDraft,
          })[0];
        draftRef.current = savedResponse;
        setDraft(savedResponse);
        setResponses((current) => mergeResponse(current, savedResponse));
      }
    });
  }

  function selectTemplate(code: string) {
    onSelectTemplate(code);
  }

  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
      <Card>
        <CardContent className="p-5">
          <div className="space-y-4">
            <div>
              <Label htmlFor="templatePicker">Template</Label>
              <Select value={template.code} onValueChange={selectTemplate}>
                <SelectTrigger id="templatePicker" className="mt-2 h-11">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {templates.map((item) => (
                    <SelectItem key={item.code} value={item.code}>
                      {item.code} · {item.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <p className="text-sm leading-6 text-slate-500">
              <span className="font-medium text-slate-700">Requirement</span>: {template.icRequirement}
            </p>
          </div>

          <form action={submit} className="mt-6 space-y-5">
            <input name="templateId" type="hidden" value={template.code} />
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <Label>Document status</Label>
                <Select
                  value={draft.documentMode}
                  onValueChange={(value) =>
                    updateDraft({ documentMode: value as AccreditationDocumentMode })
                  }
                >
                  <SelectTrigger
                    aria-label="Document status"
                    className="mt-2 h-11"
                    data-testid="accreditation-document-status"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="not_started">Not started</SelectItem>
                    <SelectItem value="have">We already have it</SelectItem>
                    <SelectItem value="create">Create document here</SelectItem>
                  </SelectContent>
                </Select>
                <input name="documentMode" type="hidden" value={draft.documentMode} />
              </div>
              <div>
                <Label>Board approval</Label>
                <Select
                  disabled={!template.boardApprovalRequired}
                  value={
                    template.boardApprovalRequired
                      ? draft.approvalStatus
                      : "not_required"
                  }
                  onValueChange={(value) =>
                    updateDraft({
                      approvalStatus:
                        value as AccreditationTemplateResponse["approvalStatus"],
                    })
                  }
                >
                  <SelectTrigger
                    aria-label="Board approval"
                    className="mt-2 h-11"
                    data-testid="accreditation-board-approval"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="not_required">Not required</SelectItem>
                    <SelectItem value="needs_board_approval">
                      Needs board approval
                    </SelectItem>
                    <SelectItem value="ready_for_board">Ready for board</SelectItem>
                    <SelectItem value="board_approved">Board approved</SelectItem>
                  </SelectContent>
                </Select>
                <input
                  name="approvalStatus"
                  type="hidden"
                  value={
                    template.boardApprovalRequired
                      ? draft.approvalStatus
                      : "not_required"
                  }
                />
              </div>
            </div>

            {draft.documentMode === "have" ? (
              <div className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <Field
                    error={fieldError(state, "evidenceName")}
                    label="Document name"
                  >
                    <Input
                      aria-label="Document name"
                      name="evidenceName"
                      onChange={(event) =>
                        updateDraft({ evidenceName: event.target.value })
                      }
                      placeholder="Board-approved conflict policy.pdf"
                      value={draft.evidenceName}
                    />
                  </Field>
                  <Field
                    error={fieldError(state, "evidenceLocation")}
                    label="Document location"
                  >
                    <Input
                      aria-label="Document location"
                      name="evidenceLocation"
                      onChange={(event) =>
                        updateDraft({ evidenceLocation: event.target.value })
                      }
                      placeholder="Google Drive folder, SharePoint, board book..."
                      value={draft.evidenceLocation}
                    />
                  </Field>
                </div>
                <Field error={fieldError(state, "evidenceFile")} label="Upload evidence file">
                  <Input
                    accept=".doc,.docx,.jpeg,.jpg,.pdf,.png,.txt,.xls,.xlsx,image/jpeg,image/png,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/plain"
                    aria-label="Upload evidence file"
                    data-testid="accreditation-evidence-file"
                    name="evidenceFile"
                    type="file"
                  />
                  <p className="mt-2 text-sm text-slate-500">
                    Optional when the official document already lives in Drive,
                    SharePoint, or a board package. HTML and code files are blocked.
                  </p>
                </Field>
                {draft.evidenceFile ? (
                  <div className="flex items-center gap-2 rounded-lg border bg-olea-light/40 px-3 py-2 text-sm font-semibold text-slate-700">
                    <Paperclip className="size-4 text-olea-green" />
                    Uploaded evidence: {draft.evidenceFile.name}
                  </div>
                ) : null}
              </div>
            ) : null}

            {draft.documentMode === "create" ? (
              <Field error={fieldError(state, "textDraft")} label="Working draft">
                <Textarea
                  aria-label="Working draft"
                  className="min-h-[320px] font-mono text-sm"
                  name="textDraft"
                  onChange={(event) => updateDraft({ textDraft: event.target.value })}
                  placeholder={template.defaultDraft}
                  value={draft.textDraft}
                />
              </Field>
            ) : null}

            <Field error={fieldError(state, "notes")} label="Internal notes">
              <Textarea
                aria-label="Internal notes"
                name="notes"
                onChange={(event) => updateDraft({ notes: event.target.value })}
                placeholder="Gaps, owner follow-up, approval context, or IC submission notes."
                value={draft.notes}
              />
            </Field>

            {!state.ok ? (
              <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-700">
                {state.error}
              </div>
            ) : null}

            <Button disabled={pending} type="submit">
              <Save className="size-4" />
              {pending ? "Saving..." : "Save template status"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <aside className="space-y-4">
        <InfoPanel title="Who completes this" items={[template.whoCompletes]} />
        <InfoPanel title="Submission checklist" items={template.checklist} />
        <InfoPanel title="Common mistakes" items={template.commonMistakes} warning />
        <InfoPanel title="Expected structure" items={template.structure} />
      </aside>
    </div>
  );
}

function SettingsTab({
  data,
  onSaved,
}: {
  data: AccreditationWorkspaceData;
  onSaved: () => void;
}) {
  const [state, setState] = useState<AccreditationActionResult>({ ok: true });
  const [pending, startTransition] = useTransition();

  function submit(formData: FormData) {
    setState({ ok: true });
    startTransition(async () => {
      const result = await saveAccreditationSettingsAction(formData);
      setState(result);
      if (result.ok) onSaved();
    });
  }

  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-start gap-3">
          <span className="grid size-11 place-items-center rounded-xl bg-olea-light text-olea-green">
            <Settings className="size-5" />
          </span>
          <div>
            <h2 className="text-2xl font-bold text-slate-950">
              Accreditation settings
            </h2>
            <p className="mt-1 text-slate-600">
              This is intentionally the last tab, but a first-time workspace opens
              here so the submission context is configured before document work begins.
            </p>
          </div>
        </div>
        <form action={submit} className="mt-6 space-y-5" noValidate>
          <div className="grid gap-4 md:grid-cols-2">
            <Field
              error={fieldError(state, "organizationName")}
              label="Organization name"
            >
              <Input
                aria-label="Organization name"
                defaultValue={data.settings.organizationName}
                name="organizationName"
                placeholder="BoraPost Community Services"
              />
            </Field>
            <Field error={fieldError(state, "charityNumber")} label="CRA charity number">
              <Input
                aria-label="CRA charity number"
                defaultValue={data.settings.charityNumber}
                name="charityNumber"
                placeholder="123456789RR0001"
              />
            </Field>
            <Field error={fieldError(state, "targetDate")} label="Target accreditation date">
              <Input
                aria-label="Target accreditation date"
                defaultValue={data.settings.targetDate}
                name="targetDate"
                type="date"
              />
            </Field>
            <Field error={fieldError(state, "leadName")} label="Accreditation lead">
              <Input
                aria-label="Accreditation lead"
                defaultValue={data.settings.leadName}
                name="leadName"
                placeholder="Full name"
              />
            </Field>
            <Field error={fieldError(state, "leadEmail")} label="Lead email">
              <Input
                aria-label="Lead email"
                defaultValue={data.settings.leadEmail}
                name="leadEmail"
                placeholder="lead@example.org"
                type="email"
              />
            </Field>
          </div>

          <fieldset>
            <legend className="text-sm font-semibold text-slate-900">
              Team roles involved
            </legend>
            <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {teamRoleOptions.map((role) => (
                <label
                  key={role}
                  className="flex items-center gap-2 rounded-lg border bg-white px-3 py-2 text-sm font-semibold text-slate-700"
                >
                  <input
                    defaultChecked={data.settings.teamRoles.includes(role)}
                    name="teamRoles"
                    type="checkbox"
                    value={role}
                  />
                  {role}
                </label>
              ))}
            </div>
          </fieldset>

          {!state.ok ? (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-700">
              {state.error}
            </div>
          ) : null}

          <Button disabled={pending} type="submit">
            <Save className="size-4" />
            {pending ? "Saving..." : "Save settings"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

function InfoPanel({
  items,
  title,
  warning,
}: {
  items: string[];
  title: string;
  warning?: boolean;
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <h3
          className={cn(
            "text-sm font-bold uppercase tracking-[0.16em]",
            warning ? "text-amber-700" : "text-olea-green",
          )}
        >
          {title}
        </h3>
        <ul className="mt-3 space-y-2 text-sm leading-6 text-slate-600">
          {items.map((item) => (
            <li key={item} className="flex gap-2">
              {warning ? (
                <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-600" />
              ) : (
                <ClipboardCheck className="mt-0.5 size-4 shrink-0 text-olea-green" />
              )}
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

function MetricCard({
  label,
  testId,
  value,
}: {
  label: string;
  testId?: string;
  value: string;
}) {
  return (
    <Card data-testid={testId}>
      <CardContent className="p-5">
        <p className="text-sm font-bold uppercase tracking-[0.16em] text-slate-400">
          {label}
        </p>
        <p className="mt-3 text-4xl font-bold text-slate-950">{value}</p>
      </CardContent>
    </Card>
  );
}

function Field({
  children,
  error,
  label,
}: {
  children: ReactNode;
  error?: string;
  label: string;
}) {
  return (
    <div>
      <Label>{label}</Label>
      <div className="mt-2">{children}</div>
      {error ? <p className="mt-1 text-sm font-semibold text-red-600">{error}</p> : null}
    </div>
  );
}

function ProgressRing({ percent }: { percent: number }) {
  return (
    <div className="rounded-2xl border bg-white p-4 text-center shadow-sm">
      <FileCheck2 className="mx-auto size-6 text-olea-green" />
      <p className="mt-2 text-3xl font-bold text-slate-950">{percent}%</p>
      <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400">
        Complete
      </p>
    </div>
  );
}

function resolveTab(value: string | undefined, configured: boolean): AccreditationTab {
  if (!configured) return "settings";
  if (tabs.includes(value as AccreditationTab)) return value as AccreditationTab;
  return "dashboard";
}

function completedCount(responses: AccreditationTemplateResponse[]) {
  return responses.filter(isResponseComplete).length;
}

function completionPercent(
  responses: AccreditationTemplateResponse[],
  total: number,
) {
  if (total <= 0) return 0;
  return Math.round((completedCount(responses) / total) * 100);
}

function fieldError(state: AccreditationActionResult, field: string) {
  if (state.ok) return undefined;
  return state.fieldErrors?.[field]?.[0];
}
