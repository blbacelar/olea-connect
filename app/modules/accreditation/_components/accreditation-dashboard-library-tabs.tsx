import { CheckCircle2, FileText } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  emptyResponse,
  isResponseComplete,
} from "@/lib/accreditation/domain";
import type {
  AccreditationTemplateResponse,
  AccreditationWorkspaceData,
} from "@/lib/accreditation/types";

import { completedCount, MetricCard } from "./accreditation-workspace-utils";

export function DashboardTab({
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
      <ConfigurationNotice configured={data.configured} />
      <DashboardMetrics data={data} responses={responses} />
      <SectionProgressGrid data={data} />
      <NextDocumentsCard
        nextTemplates={nextTemplates}
        onOpenTemplate={onOpenTemplate}
      />
    </div>
  );
}

export function LibraryTab({
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
              <SectionHeader
                sectionName={section.name}
                sectionId={section.id}
                templateCount={sectionTemplates.length}
              />
              <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {sectionTemplates.map((template) => {
                  const response =
                    responses.find((item) => item.templateId === template.code) ??
                    emptyResponse(template.code);
                  return (
                    <LibraryTemplateCard
                      complete={isResponseComplete(response)}
                      key={template.code}
                      onOpenTemplate={onOpenTemplate}
                      template={template}
                    />
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

function ConfigurationNotice({ configured }: { configured: boolean }) {
  if (configured) return null;

  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-amber-900">
      <p className="font-semibold">Start in Settings</p>
      <p className="mt-1 text-sm">
        Confirm your organization details before preparing accreditation
        documents. This keeps every document session tied to the right
        submission context.
      </p>
    </div>
  );
}

function DashboardMetrics({
  data,
  responses,
}: {
  data: AccreditationWorkspaceData;
  responses: AccreditationTemplateResponse[];
}) {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      <MetricCard
        label="Templates complete"
        testId="accreditation-templates-complete"
        value={`${completedCount(responses)} / ${data.totals.total}`}
      />
      <MetricCard
        label="Board approvals needed"
        value={data.totals.boardApprovalNeeded.toString()}
      />
      <MetricCard
        label="Ready for board"
        value={responses
          .filter((item) => item.approvalStatus === "ready_for_board")
          .length.toString()}
      />
      <MetricCard
        label="Board approved"
        value={responses
          .filter((item) => item.approvalStatus === "board_approved")
          .length.toString()}
      />
    </div>
  );
}

function SectionProgressGrid({ data }: { data: AccreditationWorkspaceData }) {
  return (
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
  );
}

function NextDocumentsCard({
  nextTemplates,
  onOpenTemplate,
}: {
  nextTemplates: AccreditationWorkspaceData["templates"];
  onOpenTemplate: (templateCode: string) => void;
}) {
  return (
    <Card>
      <CardContent className="p-5">
        <h2 className="text-xl font-bold text-slate-950">
          Next documents to finish
        </h2>
        <div className="mt-4 divide-y rounded-xl border">
          {nextTemplates.length ? (
            nextTemplates.map((template) => (
              <NextDocumentButton
                key={template.code}
                onOpenTemplate={onOpenTemplate}
                template={template}
              />
            ))
          ) : (
            <div className="p-8 text-center text-slate-500">
              All documents have a completion record.
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function NextDocumentButton({
  onOpenTemplate,
  template,
}: {
  onOpenTemplate: (templateCode: string) => void;
  template: AccreditationWorkspaceData["templates"][number];
}) {
  return (
    <button
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
  );
}

function SectionHeader({
  sectionId,
  sectionName,
  templateCount,
}: {
  sectionId: string;
  sectionName: string;
  templateCount: number;
}) {
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <p className="text-sm font-bold uppercase tracking-[0.16em] text-olea-green">
          Section {sectionId}
        </p>
        <h2 className="text-2xl font-bold text-slate-950">{sectionName}</h2>
      </div>
      <Badge variant="outline">{templateCount} templates</Badge>
    </div>
  );
}

function LibraryTemplateCard({
  complete,
  onOpenTemplate,
  template,
}: {
  complete: boolean;
  onOpenTemplate: (templateCode: string) => void;
  template: AccreditationWorkspaceData["templates"][number];
}) {
  return (
    <button
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
      <h3 className="mt-4 font-bold text-slate-900">{template.title}</h3>
      <p className="mt-2 line-clamp-3 text-sm leading-6 text-slate-500">
        {template.icRequirement}
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        <Badge variant="outline">{template.kind}</Badge>
        {template.boardApprovalRequired ? (
          <Badge className="bg-amber-100 text-amber-900">Board approval</Badge>
        ) : null}
      </div>
    </button>
  );
}
