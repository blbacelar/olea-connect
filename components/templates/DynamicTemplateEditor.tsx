"use client";

import { AlertCircle, Check, Clock, LoaderCircle, Save } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

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
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { useDynamicTemplateSession } from "@/hooks/use-dynamic-template-session";
import type {
  DynamicTemplateEditorData,
  DynamicTemplateSession,
  FieldPath,
  TemplateSection,
  TemplateExportFormat,
  TemplateExportRecord,
  TemplateSavePayload,
  TemplateValue,
} from "@/lib/template-renderer/types";
import { cn } from "@/lib/utils";

import { BoardCalendarWorkbench } from "./BoardCalendarWorkbench";
import { TemplateExportPanel } from "./TemplateExportPanel";
import { TemplateFields } from "./TemplateFields";

export function DynamicTemplateEditor({
  basePath,
  eyebrow = "Dynamic template",
  newSessionLabel = "Unsaved new workbook",
  savedSessionsLabel = "Saved workbooks",
  saveSession,
  sessionNameLabel = "Workbook name",
  startNewLabel = "Start new",
  data,
  generateExport,
  createDownloadUrl,
}: {
  basePath?: string;
  data: DynamicTemplateEditorData;
  eyebrow?: string;
  newSessionLabel?: string;
  savedSessionsLabel?: string;
  saveSession: (payload: TemplateSavePayload) => Promise<DynamicTemplateSession>;
  sessionNameLabel?: string;
  startNewLabel?: string;
  generateExport: (input: {
    templateInstanceId: string;
    format: TemplateExportFormat;
  }) => Promise<TemplateExportRecord>;
  createDownloadUrl: (exportId: string) => Promise<string>;
}) {
  const router = useRouter();
  const editorBasePath = basePath ?? `/templates/${data.template.slug}`;
  const {
    session,
    updateTitle,
    updateValue,
    updateData,
    saveState,
    saveError,
    validationErrors,
    completionPercent,
    isCompleting,
    saveNow,
    complete,
  } = useDynamicTemplateSession({
    initialSession: data.session,
    onSaved: (saved, previousSession) => {
      if (!previousSession.id && saved.id) {
        const savedSessionUrl = `${editorBasePath}?session=${saved.id}`;

        window.history.replaceState(null, "", savedSessionUrl);
      }
    },
    saveSession,
  });

  const errorsByPath = new Map(
    validationErrors.map((error) => [error.path, error.message]),
  );
  const renderSectionsAsTabs =
    (session.schemaSnapshot.presentation?.section_layout ??
      session.schemaSnapshot.presentation?.sectionLayout) === "tabs";
  const calendarEnabled =
    renderSectionsAsTabs &&
    Boolean(session.schemaSnapshot.presentation?.calendar?.enabled);
  const defaultTabValue = calendarEnabled
    ? "calendar"
    : session.schemaSnapshot.sections[0]?.id;
  const savedSessionOptions =
    session.id && !data.sessions.some((savedSession) => savedSession.id === session.id)
      ? [
          {
            id: session.id,
            title: session.title,
            status: session.status,
            updatedAt: session.lastSavedAt,
          },
          ...data.sessions,
        ]
      : data.sessions;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.08em] text-olea-dark">
            {eyebrow}
          </p>
          <h1 className="mt-1 text-[26px] font-bold tracking-[-0.02em]">
            {data.template.title}
          </h1>
          <p className="mt-1.5 max-w-2xl text-sm leading-6 text-slate-600">
            {data.template.summary}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <SaveStateLabel state={saveState} />
          <Button variant="outline" onClick={() => void saveNow()}>
            <Save className="size-4" />
            Save now
          </Button>
          <Button onClick={complete} disabled={isCompleting}>
            {isCompleting ? (
              <LoaderCircle className="size-4 animate-spin" />
            ) : (
              <Check className="size-4" />
            )}
            Mark complete
          </Button>
        </div>
      </div>

      <Card className="border-olea-green/15 bg-gradient-to-br from-white to-olea-light/50 shadow-soft">
        <CardContent className="grid gap-5 p-5 lg:grid-cols-[1.2fr_1fr_auto] lg:items-end">
          <div className="space-y-2">
            <Label htmlFor="template-session-title">{sessionNameLabel}</Label>
            <Input
              id="template-session-title"
              value={session.title}
              onChange={(event) => updateTitle(event.target.value)}
              placeholder={`${data.template.title} ${new Date().getFullYear()}`}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="template-session-picker">{savedSessionsLabel}</Label>
            <Select
              value={session.id || "new"}
              onValueChange={(value) =>
                router.push(`${editorBasePath}?session=${value}`)
              }
            >
              <SelectTrigger id="template-session-picker">
                <SelectValue placeholder="Choose a workbook" />
              </SelectTrigger>
              <SelectContent>
                {!session.id ? (
                  <SelectItem value="new">{newSessionLabel}</SelectItem>
                ) : null}
                {savedSessionOptions.map((savedSession) => (
                  <SelectItem key={savedSession.id} value={savedSession.id}>
                    {savedSession.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button asChild variant="outline">
            <Link href={`${editorBasePath}?session=new`}>
              <PlusIcon />
              {startNewLabel}
            </Link>
          </Button>
        </CardContent>
      </Card>

      <Card className="border-olea-green/15 bg-gradient-to-br from-white to-olea-light/50 shadow-soft">
        <CardContent className="grid gap-4 p-5 md:grid-cols-[1fr_auto] md:items-center">
          <div>
            <p className="text-sm font-semibold text-slate-900">
              {completionPercent}% complete
            </p>
            <div
              aria-label={`${completionPercent}% complete`}
              className="mt-2 h-2 overflow-hidden rounded-full bg-white"
              role="progressbar"
              aria-valuenow={completionPercent}
              aria-valuemin={0}
              aria-valuemax={100}
            >
              <div
                className="h-full rounded-full bg-olea-green transition-all"
                style={{ width: `${completionPercent}%` }}
              />
            </div>
          </div>
          <div className="text-sm text-slate-600">
            Schema v{session.schemaVersion} · Brand snapshot:{" "}
            {session.brandingSnapshot.organizationName}
          </div>
        </CardContent>
      </Card>

      {saveError ? (
        <p
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700"
        >
          {saveError}
        </p>
      ) : null}

      {validationErrors.length > 0 ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-900">
          <div className="flex items-center gap-2 font-semibold">
            <AlertCircle className="size-4" />
            Complete {validationErrors.length} required item
            {validationErrors.length === 1 ? "" : "s"} before marking complete.
          </div>
        </div>
      ) : null}

      <div className="space-y-5">
        {session.schemaSnapshot.header_fields?.length ? (
          <section className="rounded-xl border bg-white p-6 shadow-soft">
            <h2 className="text-xl font-semibold">Header information</h2>
            <p className="mt-1.5 text-sm leading-6 text-slate-500">
              These details are saved with this template session.
            </p>
            <div className="mt-5 grid gap-5 md:grid-cols-2">
              <TemplateFields
                fields={session.schemaSnapshot.header_fields}
                data={session.formData}
                errorsByPath={errorsByPath}
                onChange={updateValue}
              />
            </div>
          </section>
        ) : null}

        {calendarEnabled ? (
          <BoardCalendarWorkbench
            data={session.formData}
            errorsByPath={errorsByPath}
            organizationName={session.brandingSnapshot.organizationName}
            sections={session.schemaSnapshot.sections}
            onChange={updateValue}
            onDataChange={updateData}
          />
        ) : renderSectionsAsTabs ? (
          <Tabs
            defaultValue={defaultTabValue}
            className="rounded-xl border bg-white p-4 shadow-soft"
          >
            <TabsList className="h-auto w-full flex-wrap justify-start gap-1 bg-slate-100">
              {session.schemaSnapshot.sections.map((section) => (
                <TabsTrigger
                  key={section.id}
                  value={section.id}
                  className="data-[state=active]:bg-white"
                >
                  {section.title}
                </TabsTrigger>
              ))}
            </TabsList>
            {session.schemaSnapshot.sections.map((section) => (
              <TabsContent key={section.id} value={section.id}>
                <SectionFields
                  section={section}
                  data={session.formData}
                  errorsByPath={errorsByPath}
                  onChange={updateValue}
                />
              </TabsContent>
            ))}
          </Tabs>
        ) : (
          session.schemaSnapshot.sections.map((section) => (
            <SectionFields
              key={section.id}
              section={section}
              data={session.formData}
              errorsByPath={errorsByPath}
              onChange={updateValue}
            />
          ))
        )}
      </div>

      <TemplateExportPanel
        templateInstanceId={session.id}
        supportsPdf={data.template.supportsPdf}
        supportsDocx={data.template.supportsDocx}
        initialExports={data.exports}
        generateExport={generateExport}
        createDownloadUrl={createDownloadUrl}
      />
    </div>
  );
}

function PlusIcon() {
  return <span className="text-lg leading-none">+</span>;
}

function SectionFields({
  section,
  data,
  errorsByPath,
  onChange,
}: {
  section: TemplateSection;
  data: DynamicTemplateSession["formData"];
  errorsByPath: Map<string, string>;
  onChange: (path: FieldPath, value: TemplateValue) => void;
}) {
  return (
    <section
      className="rounded-xl border bg-white p-6 shadow-soft"
      aria-labelledby={`${section.id}-heading`}
    >
      <h2 id={`${section.id}-heading`} className="text-xl font-semibold">
        {section.title}
      </h2>
      {section.description ? (
        <p className="mt-1.5 text-sm leading-6 text-slate-500">
          {section.description}
        </p>
      ) : null}
      <div
        className={cn(
          "mt-5",
          section.layout === "two_column"
            ? "grid gap-5 md:grid-cols-2"
            : "space-y-5",
        )}
      >
        <TemplateFields
          fields={section.questions}
          data={data}
          errorsByPath={errorsByPath}
          onChange={onChange}
        />
      </div>
    </section>
  );
}

function SaveStateLabel({ state }: { state: string }) {
  if (state === "saving") {
    return (
      <span className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-600">
        <LoaderCircle className="size-4 animate-spin" />
        Saving
      </span>
    );
  }
  if (state === "error") {
    return (
      <span className="inline-flex items-center gap-1.5 text-sm font-medium text-red-600">
        <AlertCircle className="size-4" />
        Save failed
      </span>
    );
  }
  if (state === "unsaved") {
    return (
      <span className="inline-flex items-center gap-1.5 text-sm font-medium text-amber-600">
        <Clock className="size-4" />
        Unsaved changes
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-600">
      <Check className="size-4 text-olea-green" />
      Saved
    </span>
  );
}
