"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { BookOpen, Download, Printer, Save } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { MobileSectionSelect } from "@/components/ui/mobile-section-select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { workbookModules, type WorkbookValues } from "@/lib/strategic-planning/workbook";
import type { WorkbookAction } from "@/lib/strategic-planning/action-tracker";
import { convertLegacyStrategicWorkbook } from "@/lib/strategic-planning/legacy-import";

import { saveStrategicWorkbook } from "./actions";
import { BoardDashboardEditor } from "./board-dashboard";
import { PlanDocument } from "./plan-document";
import { WorkbookActions, WorkbookBudget, WorkbookRollover, WorkbookTracker } from "./workbook-actions";
import { WorkbookSectionEditor } from "./workbook-fields";
import { WorkbookSurveyResults } from "./workbook-survey-results";

type Data = Awaited<ReturnType<typeof import("@/lib/data/strategic-workbook").getStrategicWorkbookData>>;

function Guidance({ module, size, equityOn }: {
  module: (typeof workbookModules)[number];
  size: string;
  equityOn: boolean;
}) {
  return <div className="space-y-5">
    {module.guidance?.map((item) => <section key={item.h} className="rounded-xl border bg-white p-5 shadow-sm">
      <h3 className="text-lg font-semibold">{item.h}</h3>
      <div className="prose prose-slate mt-3 max-w-none text-sm leading-7"
        dangerouslySetInnerHTML={{ __html: item.html }} />
    </section>)}
    {module.questions?.length ? <section className="rounded-xl border bg-white p-5 shadow-sm">
      <h3 className="text-lg font-semibold">Questions to ask</h3>
      <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-slate-700">
        {module.questions.map((question) => <li key={question}>{question}</li>)}
      </ul>
    </section> : null}
    {module.steps?.length ? <section className="rounded-xl border bg-white p-5 shadow-sm">
      <h3 className="text-lg font-semibold">Steps</h3>
      <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm text-slate-700">
        {module.steps.map((step) => <li key={step}>{step}</li>)}
      </ol>
    </section> : null}
    {module.scale?.[size] ? <section className="rounded-xl border bg-white p-5 shadow-sm">
      <h3 className="text-lg font-semibold">Scale it to your size</h3>
      <p className="mt-2 text-sm leading-7 text-slate-700">{module.scale[size]}</p>
    </section> : null}
    {equityOn && module.equity?.length ? <section className="rounded-xl border bg-white p-5 shadow-sm">
      <h3 className="text-lg font-semibold">Equity and reconciliation lens</h3>
      <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-slate-700">
        {module.equity.map((item) => <li key={item}>{item}</li>)}
      </ul>
    </section> : null}
    {module.facilitator?.length ? <section className="rounded-xl border bg-white p-5 shadow-sm">
      <h3 className="text-lg font-semibold">Facilitator notes</h3>
      <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-slate-700">
        {module.facilitator.map((item) => <li key={item}>{item}</li>)}
      </ul>
    </section> : null}
    {module.tips?.length ? <section className="rounded-xl border bg-white p-5 shadow-sm">
      <h3 className="text-lg font-semibold">Common pitfalls</h3>
      <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-slate-700">
        {module.tips.map((item) => <li key={item}>{item}</li>)}
      </ul>
    </section> : null}
    {module.output ? <p className="rounded-xl border bg-white p-5 text-sm"><strong>Output:</strong> {module.output}</p> : null}
  </div>;
}

export function StrategicWorkbook({ data }: { data: Data }) {
  const router = useRouter();
  const [values, setValues] = useState<WorkbookValues>(data.values);
  const [actions, setActions] = useState<WorkbookAction[]>(data.actions);
  const [revision, setRevision] = useState(data.revision);
  const [moduleIndex, setModuleIndex] = useState(0);
  const [activeView, setActiveView] = useState<"module" | "plan" | "tracker" | "budget" | "board">("module");
  const [tab, setTab] = useState("guidance");
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [importOpen, setImportOpen] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const editVersion = useRef(0);
  const module = workbookModules[moduleIndex];
  const size = values["set.size"] || "mid";
  const horizon = Number(values["set.horizon"] || 3);
  const equityOn = (values["set.equity"] || "on") === "on";
  const selectedModules = (values["start.use"] || "").split("|").filter(Boolean);
  const title = activeView === "module" ? module.title : activeView === "plan" ? "Your strategic plan" : activeView === "tracker" ? "Action tracker" :
    activeView === "budget" ? "Plan budget" : "Board dashboard";
  const sectionOptions = [
    ...workbookModules.map((item) => ({ value: `module:${item.id}`, label: `${item.num}. ${item.short}` })),
    { value: "plan", label: "Your strategic plan" }, { value: "tracker", label: "Action tracker" },
    { value: "budget", label: "Plan budget" }, { value: "board", label: "Board dashboard" },
    { value: "surveys", label: "Stakeholder surveys" },
  ];

  function navigateSection(value: string) {
    if (value === "surveys") {
      router.push("/modules/strategic-planning/surveys");
      return;
    }
    if (value.startsWith("module:")) {
      const index = workbookModules.findIndex((item) => item.id === value.slice(7));
      if (index >= 0) { setActiveView("module"); setModuleIndex(index); setTab("guidance"); }
      return;
    }
    if (["plan", "tracker", "budget", "board"].includes(value)) {
      setActiveView(value as "plan" | "tracker" | "budget" | "board");
    }
  }

  function setValue(key: string, value: string) {
    if (key === "set.horizon" && actions.some((action) => action.year > Number(value))) {
      setMessage("Move or remove actions beyond the new plan horizon before changing it.");
      return;
    }
    setValues((current) => ({ ...current, [key]: value }));
    editVersion.current += 1;
    setDirty(true);
    setMessage("");
  }

  function changeActions(next: WorkbookAction[]) {
    setActions(next);
    editVersion.current += 1;
    setDirty(true);
    setMessage("");
  }

  const save = useCallback(async () => {
    if (document.querySelector('[data-currency-field="true"][aria-invalid="true"]')) {
      setMessage("Correct the CAD amount before saving the workbook.");
      return;
    }
    const savingVersion = editVersion.current;
    setSaving(true);
    setMessage("");
    try {
      const result = await saveStrategicWorkbook({ revision, values, actions });
      if (result.status === "conflict") {
        setMessage(result.message);
        return;
      }
      setRevision(result.revision);
      const newChangesArrived = savingVersion !== editVersion.current;
      setDirty(newChangesArrived);
      setMessage(newChangesArrived ? "" : result.message);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not save this workbook.");
    } finally {
      setSaving(false);
    }
  }, [revision, values, actions]);

  async function importWorkbook() {
    if (!importFile) {
      setMessage("Choose a workbook JSON file first.");
      return;
    }
    if (importFile.size > 1_000_000) {
      setMessage("Choose a workbook JSON file smaller than 1 MB.");
      return;
    }
    setSaving(true);
    setMessage("");
    try {
      const payload: unknown = JSON.parse(await importFile.text());
      if (!payload || typeof payload !== "object" ||
        (payload as { workbook?: unknown }).workbook !== "strategic-planning" ||
        ![1, 2].includes(Number((payload as { version?: unknown }).version))) {
        throw new Error("Choose a Strategic Planning workbook JSON export from Olea Connects.");
      }
      const imported = (payload as { data?: unknown }).data;
      const fromSourceHtml = (payload as { version?: unknown }).version === 1;
      const converted = fromSourceHtml ? convertLegacyStrategicWorkbook(imported) : null;
      if (!converted && (!imported || typeof imported !== "object" ||
        !Array.isArray((imported as { actions?: unknown }).actions) ||
        !(imported as { values?: unknown }).values ||
        typeof (imported as { values?: unknown }).values !== "object")) {
        throw new Error("The workbook file is missing its values or actions.");
      }
      const next = converted ?? imported as { values: WorkbookValues; actions: WorkbookAction[] };
      const result = await saveStrategicWorkbook({ revision, values: next.values, actions: next.actions });
      if (result.status === "conflict") throw new Error(result.message);
      setValues(next.values);
      setActions(next.actions);
      setRevision(result.revision);
      setDirty(false);
      setImportOpen(false);
      setImportFile(null);
      setMessage(converted?.skippedKeys.length ?
        `Workbook imported and saved. ${converted.skippedKeys.length} source-only fields were preserved in the JSON export; review these in the original HTML if needed.` :
        "Workbook imported and saved for this organization.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not import this workbook.");
    } finally {
      setSaving(false);
    }
  }

  useEffect(() => {
    if (!dirty || saving || message || !data.hasAccess || !data.canManage) return;
    const timer = window.setTimeout(() => void save(), 1200);
    return () => window.clearTimeout(timer);
  }, [dirty, saving, message, save, data.hasAccess, data.canManage]);

  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  if (!data.hasAccess || !data.canManage) return <main className="space-y-5">
    <h1 className="text-2xl font-semibold">Strategic Planning workbook</h1>
    <p className="text-slate-600">An organization owner or administrator with Strategic Planning access can edit this workbook.</p>
    <Button asChild variant="outline"><Link href="/modules/strategic-planning">Back to Strategic Planning</Link></Button>
  </main>;

  return <main className="space-y-5">
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div>
        <Button asChild variant="link" className="px-0"><Link href="/modules/strategic-planning">Back to Strategic Planning</Link></Button>
        <p className="mt-1 text-xs font-semibold uppercase tracking-widest text-olea-green">Strategic Planning workbook</p>
        <h1 className="mt-1 text-3xl font-bold">{title}</h1>
        <p className="mt-2 max-w-3xl text-sm text-slate-600">{activeView === "module" ? module.purpose :
          activeView === "plan" ? "Review the plan assembled from your workbook before taking it to the board." :
          activeView === "tracker" ? "Track each action quarter by quarter, with an owner, status, spending and next step." :
            activeView === "budget" ? "Review action budgets and spending for every year of the plan." :
              "Review quarterly progress and share a fixed report with board members."}</p>
      </div>
      <div className="flex flex-wrap gap-2">
        {!dirty && revision > 0 ? <Button asChild type="button" variant="outline"><Link
          href={`/api/strategic-planning/workbook/print?scope=current&module=${module.id}&format=pdf`}
          target="_blank" rel="noopener noreferrer"><Printer className="size-4" />Print current module</Link></Button> : null}
        {!dirty && revision > 0 ? <Button asChild type="button" variant="outline"><Link
          href="/api/strategic-planning/workbook/print?scope=all&format=pdf"
          target="_blank" rel="noopener noreferrer"><Printer className="size-4" />Print full workbook</Link></Button> : null}
        {!dirty && revision > 0 ? <Button asChild variant="outline"><Link href="/api/strategic-planning/data-export?kind=workbook"
          target="_blank" rel="noopener noreferrer"><Download className="size-4" />Export workbook JSON</Link></Button> : null}
        <Dialog open={importOpen} onOpenChange={setImportOpen}>
          <DialogTrigger asChild><Button type="button" variant="outline">Import workbook JSON</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Import a workbook</DialogTitle>
              <DialogDescription>Choose an Olea Connects Strategic Planning JSON export from this app or the original HTML workbook. Importing replaces this organization&apos;s current workbook after validation.</DialogDescription>
            </DialogHeader>
            <label className="space-y-2 text-sm font-medium">Workbook JSON file
              <Input type="file" accept="application/json,.json" onChange={(event) =>
                setImportFile(event.target.files?.[0] ?? null)} />
            </label>
            <Button type="button" disabled={!importFile || saving} onClick={() => void importWorkbook()}>
              {saving ? "Importing..." : "Import and replace workbook"}
            </Button>
          </DialogContent>
        </Dialog>
        <Button type="button" onClick={() => void save()} disabled={!dirty || saving}>
          <Save className="size-4" /> {saving ? "Saving..." : dirty ? "Save workbook" : "Saved"}
        </Button>
      </div>
    </div>
    {message ? <p role="status" className="rounded-lg border bg-white p-3 text-sm">{message}</p> : null}
    <div className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-5 lg:grid-cols-[230px_minmax(0,1fr)]">
      <div className="min-w-0 lg:hidden">
        <MobileSectionSelect label="Workbook section" hideAt="lg" variant="dialog"
          value={activeView === "module" ? `module:${module.id}` : activeView}
          options={sectionOptions} onValueChange={navigateSection} />
      </div>
      <nav aria-label="Workbook modules" className="hidden min-w-0 flex-col gap-1 self-start rounded-xl border bg-white p-2 lg:sticky lg:top-5 lg:flex">
        {workbookModules.map((item, index) => <Button key={item.id} type="button"
          variant={activeView === "module" && moduleIndex === index ? "secondary" : "ghost"}
          className={`justify-start whitespace-normal text-left ${index > 0 && selectedModules.length &&
            !selectedModules.includes(item.id) ? "opacity-50" : ""}`}
          onClick={() => { setActiveView("module"); setModuleIndex(index); setTab("guidance"); }}>
          {item.num}. {item.short}
        </Button>)}
        <div className="my-2 border-t" />
        <Button type="button" variant={activeView === "plan" ? "secondary" : "ghost"}
          className="justify-start" onClick={() => setActiveView("plan")}>Your strategic plan</Button>
        <Button type="button" variant={activeView === "tracker" ? "secondary" : "ghost"}
          className="justify-start" onClick={() => setActiveView("tracker")}>Action tracker</Button>
        <Button type="button" variant={activeView === "budget" ? "secondary" : "ghost"}
          className="justify-start" onClick={() => setActiveView("budget")}>Plan budget</Button>
        <Button type="button" variant={activeView === "board" ? "secondary" : "ghost"}
          className="justify-start" onClick={() => setActiveView("board")}>Board dashboard</Button>
        <Button asChild variant="ghost" className="justify-start"><Link href="/modules/strategic-planning/surveys">Stakeholder surveys</Link></Button>
      </nav>
      <div className="min-w-0 space-y-5">
        {activeView === "plan" ? <PlanDocument values={values} actions={actions} canExport={!dirty && revision > 0} /> : null}
        {activeView === "tracker" ? <WorkbookTracker actions={actions} setActions={changeActions}
          values={values} horizon={horizon} canExport={!dirty && revision > 0} /> : null}
        {activeView === "budget" ? <WorkbookBudget actions={actions} horizon={horizon}
          values={values} setValue={setValue} setActions={changeActions}
          canExport={!dirty && revision > 0} /> : null}
        {activeView === "board" ? <BoardDashboardEditor values={values} actions={actions}
          horizon={horizon} dirty={dirty} /> : null}
        {activeView === "module" ? <>
        <Card><CardContent className="flex flex-wrap items-center gap-4 p-4 text-sm text-slate-600">
          <BookOpen className="size-5 text-olea-green" />
          <span><strong>Who:</strong> {module.who}</span>
          <span><strong>Time:</strong> {module.time[size] ?? module.time.mid}</span>
        </CardContent></Card>
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList><TabsTrigger value="guidance">Guidance</TabsTrigger><TabsTrigger value="template">Template</TabsTrigger></TabsList>
          <TabsContent value="guidance" className="mt-5">
            <Guidance module={module} size={size} equityOn={equityOn} />
          </TabsContent>
          <TabsContent value="template" className="mt-5 space-y-4">
            {module.template.filter((section) => (!section.equity || equityOn) &&
              (!section.sizes || section.sizes.includes(size)))
              .map((section) => <div key={section.title} className="space-y-3">
                <WorkbookSectionEditor section={section} values={values} setValue={setValue} horizon={horizon} />
                {section.custom === "surveyLink" ? <Card><CardContent className="flex flex-wrap items-center justify-between gap-4 p-5">
                  <p className="max-w-2xl text-sm text-slate-600">Choose stakeholder groups, publish anonymous surveys, and bring the results into your plan.</p>
                  <Button asChild><Link href="/modules/strategic-planning/surveys">Open stakeholder surveys</Link></Button>
                </CardContent></Card> : null}
                {section.custom === "surveyLink" ? <WorkbookSurveyResults values={values} setValue={setValue}
                  surveyQuestions={data.surveyQuestions} onlineResponseCounts={data.onlineResponseCounts} /> : null}
                {section.custom === "actions" ? <WorkbookActions actions={actions} setActions={changeActions}
                  values={values} horizon={horizon} /> : null}
                {section.custom === "costs" ? <WorkbookBudget actions={actions} horizon={horizon}
                  values={values} setValue={setValue} setActions={changeActions} /> : null}
                {section.custom === "rollover" ? <WorkbookRollover actions={actions} setActions={changeActions}
                  values={values} horizon={horizon} /> : null}
              </div>)}
          </TabsContent>
        </Tabs>
        <div className="flex justify-between gap-3">
          <Button type="button" variant="outline" disabled={moduleIndex === 0}
            onClick={() => { setModuleIndex(moduleIndex - 1); setTab("guidance"); }}>Previous module</Button>
          <Button type="button" variant="outline" disabled={moduleIndex === workbookModules.length - 1}
            onClick={() => { setModuleIndex(moduleIndex + 1); setTab("guidance"); }}>Next module</Button>
        </div>
        </> : null}
      </div>
    </div>
  </main>;
}
