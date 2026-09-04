"use client";

import {
  FileDown,
  FileText,
  FolderOpen,
  LayoutDashboard,
  Loader2,
  Settings,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { emptyResponse } from "@/lib/accreditation/domain";
import type {
  AccreditationTemplateResponse,
  AccreditationWorkspaceData,
} from "@/lib/accreditation/types";

import {
  DashboardTab,
  LibraryTab,
} from "./accreditation-dashboard-library-tabs";
import { EditorTab } from "./accreditation-editor-tab";
import { SettingsTab } from "./accreditation-settings-tab";
import {
  type AccreditationTab,
  ProgressRing,
  completionPercent,
  resolveTab,
} from "./accreditation-workspace-utils";

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
    getInitialTemplateCode(data, activeTemplateCode),
  );
  const selectedTemplate =
    data.templates.find((template) => template.code === selectedCode) ??
    data.templates[0];
  const selectedResponse = getSelectedResponse(responses, selectedTemplate.code);
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
      await downloadAccreditationPdf();
    } catch (error) {
      setExportError(
        error instanceof Error
          ? error.message
          : "Unable to generate the accreditation report right now.",
      );
    } finally {
      setIsExporting(false);
    }
  }

  return (
    <section className="space-y-5" data-testid="accreditation-workspace">
      <AccreditationHeader
        exportError={exportError}
        isExporting={isExporting}
        onExportPdf={() => void handleExportPdf()}
        percent={completionPercent(workspace.responses, workspace.totals.total)}
      />
      <Tabs data-testid="accreditation-tabs" value={tab} onValueChange={changeTab}>
        <AccreditationTabsList />
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

function AccreditationHeader({
  exportError,
  isExporting,
  onExportPdf,
  percent,
}: {
  exportError: string;
  isExporting: boolean;
  onExportPdf: () => void;
  percent: number;
}) {
  return (
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
            onClick={onExportPdf}
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
            <p className="max-w-xs text-right text-sm text-red-700">
              {exportError}
            </p>
          ) : null}
          <ProgressRing percent={percent} />
        </div>
      </div>
    </header>
  );
}

function AccreditationTabsList() {
  return (
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
  );
}

async function downloadAccreditationPdf() {
  const response = await fetch("/api/accreditation/export", {
    credentials: "include",
  });
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as {
      error?: string;
    } | null;
    throw new Error(
      body?.error ?? "Unable to generate the accreditation report right now.",
    );
  }

  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  const disposition = response.headers.get("content-disposition");
  anchor.href = url;
  anchor.download =
    disposition?.match(/filename="([^"]+)"/)?.[1] ??
    "accreditation-preparation-workspace.pdf";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

function getInitialTemplateCode(
  data: AccreditationWorkspaceData,
  activeTemplateCode: string | undefined,
) {
  return data.templates.some((template) => template.code === activeTemplateCode)
    ? activeTemplateCode!
    : data.templates[0]?.code ?? "A1";
}

function getSelectedResponse(
  responses: AccreditationTemplateResponse[],
  templateCode: string,
) {
  return (
    responses.find((response) => response.templateId === templateCode) ??
    emptyResponse(templateCode)
  );
}
