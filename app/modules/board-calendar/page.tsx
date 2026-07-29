import { FileClock } from "lucide-react";
import Link from "next/link";

import { DynamicTemplateEditor } from "@/components/templates/DynamicTemplateEditor";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { getDynamicTemplateEditorData } from "@/lib/data/templates";
import { boardCalendarModule } from "@/lib/modules";

import {
  createTemplateExportDownloadUrl,
  generateTemplateExport,
  saveDynamicTemplateSession,
} from "../../templates/actions";

export default async function BoardCalendarModulePage({
  searchParams,
}: {
  searchParams?: { session?: string };
}) {
  const editorData = await getDynamicTemplateEditorData(
    boardCalendarModule.resourceSlug,
    searchParams?.session,
  );

  if (!editorData) {
    return (
      <Card className="overflow-hidden shadow-soft">
        <div className="h-2 bg-olea-orange" />
        <CardContent className="grid min-h-[520px] place-items-center p-6 text-center md:p-12">
          <div className="max-w-xl">
            <span className="mx-auto grid size-16 place-items-center rounded-xl bg-olea-light text-olea-green">
              <FileClock className="size-8" />
            </span>
            <p className="mt-5 text-xs font-semibold uppercase tracking-[0.08em] text-olea-green">
              Module unavailable
            </p>
            <h1 className="mt-2 text-balance text-3xl font-bold md:text-4xl">
              Board Calendar
            </h1>
            <p className="mx-auto mt-4 max-w-lg leading-7 text-slate-600">
              This module is not available for your current workspace yet.
              Upgrade your plan or choose it as one of your selected resources
              to use the connected board calendar system.
            </p>
            <Button asChild className="mt-8">
              <Link href="/templates">Browse resources</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <DynamicTemplateEditor
      basePath={boardCalendarModule.path}
      data={editorData}
      eyebrow="Board portal"
      headerAction={
        <Button asChild variant="outline">
          <Link href="/templates">Back to resources</Link>
        </Button>
      }
      newSessionLabel="Unsaved new calendar"
      savedSessionsLabel="Saved calendars"
      saveSession={saveDynamicTemplateSession}
      sessionNameLabel="Calendar workspace name"
      startNewLabel="Start new calendar"
      generateExport={generateTemplateExport}
      createDownloadUrl={createTemplateExportDownloadUrl}
    />
  );
}
