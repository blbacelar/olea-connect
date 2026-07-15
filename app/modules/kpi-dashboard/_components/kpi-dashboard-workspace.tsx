import { Archive, BarChart3, ClipboardList, Save, Settings } from "lucide-react";

import {
  archiveKpiDefinition,
  createKpiDefinition,
  createKpiMilestone,
  createKpiRisk,
  deleteKpiMilestone,
  deleteKpiRisk,
  resetKpiQuarterSettings,
  saveKpiAnnualSummary,
  saveKpiBoardAssessment,
  saveKpiQuarterResult,
  updateKpiDashboardSettings,
  updateKpiQuarterSettings,
} from "@/app/modules/kpi-dashboard/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import type { KpiDashboardData, KpiDefinition } from "@/lib/data/kpi-dashboard";
import {
  calculatePercentToTarget,
  calculateTrend,
  calculateVariance,
  formatNumber,
  formatPercent,
  milestoneLabels,
  milestoneStatuses,
  monthOptions,
  ragLabels,
  ragStatuses,
  suggestRagStatus,
  type QuarterNumber,
  type RagStatus,
} from "@/lib/kpi-dashboard/domain";
import { cn } from "@/lib/utils";

const tabOptions = [
  { value: "setup", label: "Setup & Branding" },
  { value: "settings", label: "Settings" },
  { value: "q1", label: "Q1 Tracker" },
  { value: "q2", label: "Q2 Tracker" },
  { value: "q3", label: "Q3 Tracker" },
  { value: "q4", label: "Q4 Tracker" },
  { value: "board", label: "Board Dashboard" },
  { value: "milestones", label: "Milestones & Risks" },
  { value: "annual", label: "Annual Summary" },
] as const;

const quarterValues: QuarterNumber[] = [1, 2, 3, 4];

function HiddenDashboard({ dashboardId }: { dashboardId: string }) {
  return <input type="hidden" name="dashboardId" value={dashboardId} />;
}

function SelectField({
  defaultValue,
  name,
  options,
  placeholder,
}: {
  defaultValue?: string;
  name: string;
  options: Array<{ label: string; value: string }>;
  placeholder: string;
}) {
  return (
    <Select name={name} defaultValue={defaultValue}>
      <SelectTrigger className="h-11 bg-white">
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {options.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function RagBadge({ status }: { status: RagStatus }) {
  return (
    <Badge
      variant="outline"
      className={cn(
        "border-transparent",
        status === "green" && "bg-green-100 text-green-800",
        status === "amber" && "bg-amber-100 text-amber-800",
        status === "red" && "bg-red-100 text-red-800",
        status === "na" && "bg-slate-100 text-slate-600",
      )}
    >
      {ragLabels[status]}
    </Badge>
  );
}

function FieldHint({ children }: { children: React.ReactNode }) {
  return <p className="mt-1 text-xs leading-5 text-slate-500">{children}</p>;
}

function EmptyState({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-dashed bg-slate-50 p-8 text-center text-slate-600">
      {children}
    </div>
  );
}

function getResult(data: KpiDashboardData, kpiId: string, quarter: QuarterNumber) {
  return data.results.find(
    (result) => result.kpiId === kpiId && result.quarter === quarter,
  );
}

function getAssessment(data: KpiDashboardData, kpiId: string) {
  return data.assessments.find((assessment) => assessment.kpiId === kpiId);
}

function getQuarterMonths(data: KpiDashboardData, quarter: QuarterNumber) {
  const monthNames = data.quarters
    .filter((assignment) => assignment.quarter === quarter)
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map(
      (assignment) =>
        monthOptions.find((month) => month.value === assignment.monthNumber)?.label,
    )
    .filter(Boolean);

  return monthNames.length > 0 ? monthNames.join(", ") : "No months assigned";
}

function KpiSummaryCards({ data }: { data: KpiDashboardData }) {
  const fullYearStatuses = data.kpis.map(
    (kpi) => getAssessment(data, kpi.id)?.fullYearRag ?? "na",
  );
  const scorecard = {
    green: fullYearStatuses.filter((status) => status === "green").length,
    amber: fullYearStatuses.filter((status) => status === "amber").length,
    red: fullYearStatuses.filter((status) => status === "red").length,
  };

  return (
    <div className="grid gap-4 md:grid-cols-4">
      <Card>
        <CardContent className="p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
            KPIs
          </p>
          <p className="mt-2 text-3xl font-bold">{data.kpis.length}</p>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-green-700">
            Green
          </p>
          <p className="mt-2 text-3xl font-bold">{scorecard.green}</p>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-amber-700">
            Amber
          </p>
          <p className="mt-2 text-3xl font-bold">{scorecard.amber}</p>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-red-700">
            Red
          </p>
          <p className="mt-2 text-3xl font-bold">{scorecard.red}</p>
        </CardContent>
      </Card>
    </div>
  );
}

function SetupTab({ data }: { data: KpiDashboardData }) {
  return (
    <div className="grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
      <Card>
        <CardHeader>
          <CardTitle>Dashboard setup</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={updateKpiDashboardSettings} className="space-y-4">
            <HiddenDashboard dashboardId={data.dashboard.id} />
            <label className="block text-sm font-semibold">
              Organization name
              <Input
                className="mt-2"
                defaultValue={data.dashboard.organizationName}
                maxLength={140}
                name="organizationName"
                required
              />
            </label>
            <label className="block text-sm font-semibold">
              Dashboard title
              <Input
                className="mt-2"
                defaultValue={data.dashboard.title}
                maxLength={140}
                minLength={3}
                name="title"
                required
              />
            </label>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block text-sm font-semibold">
                Reporting year
                <Input
                  className="mt-2"
                  defaultValue={data.dashboard.reportingYear}
                  inputMode="numeric"
                  max={2100}
                  min={2000}
                  name="reportingYear"
                  pattern="[0-9]{4}"
                  required
                  type="number"
                />
                <FieldHint>Use a four-digit year, for example 2026.</FieldHint>
              </label>
              <label className="block text-sm font-semibold">
                Financial year end
                <Input
                  className="mt-2"
                  defaultValue={data.dashboard.financialYearEnd ?? ""}
                  name="financialYearEnd"
                  type="date"
                />
              </label>
            </div>
            <Button type="submit">
              <Save className="h-4 w-4" />
              Save setup
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Add a KPI</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={createKpiDefinition} className="grid gap-4 lg:grid-cols-2">
            <HiddenDashboard dashboardId={data.dashboard.id} />
            <label className="block text-sm font-semibold">
              Domain
              <Input
                className="mt-2"
                maxLength={80}
                minLength={2}
                name="domain"
                placeholder="Programs, Finance, People..."
                required
              />
            </label>
            <label className="block text-sm font-semibold">
              KPI name
              <Input
                className="mt-2"
                maxLength={140}
                minLength={2}
                name="name"
                placeholder="Client satisfaction"
                required
              />
            </label>
            <label className="block text-sm font-semibold">
              Owner
              <Input
                className="mt-2"
                maxLength={100}
                name="owner"
                placeholder="Executive Director"
              />
            </label>
            <label className="block text-sm font-semibold">
              Outcome/funder tag
              <Input
                className="mt-2"
                maxLength={120}
                name="outcomeArea"
                placeholder="Strategic goal or funder report"
              />
            </label>
            <label className="block text-sm font-semibold">
              Target as displayed
              <Input
                className="mt-2"
                maxLength={60}
                name="targetDisplay"
                placeholder=">= 70% or $1.5M"
                required
              />
            </label>
            <label className="block text-sm font-semibold">
              Target as number
              <Input
                className="mt-2"
                inputMode="decimal"
                name="targetNumber"
                pattern="\\d+(\\.\\d{1,2})?"
                placeholder="70 or 1500000"
                required
              />
              <FieldHint>Numbers only, up to 2 decimals. No currency symbols.</FieldHint>
            </label>
            <label className="block text-sm font-semibold">
              Baseline number
              <Input
                className="mt-2"
                inputMode="decimal"
                name="baselineNumber"
                pattern="\\d+(\\.\\d{1,2})?"
                placeholder="Optional"
              />
            </label>
            <div className="flex items-end">
              <Button className="w-full" type="submit">
                Add KPI
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card className="xl:col-span-2">
        <CardHeader>
          <CardTitle>KPI definitions</CardTitle>
        </CardHeader>
        <CardContent>
          {data.kpis.length === 0 ? (
            <EmptyState>Add your first KPI above. Nothing is prefilled.</EmptyState>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Domain</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Owner</TableHead>
                  <TableHead>Target</TableHead>
                  <TableHead>Baseline</TableHead>
                  <TableHead>Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.kpis.map((kpi) => (
                  <TableRow key={kpi.id}>
                    <TableCell className="font-semibold">{kpi.domain}</TableCell>
                    <TableCell>{kpi.name}</TableCell>
                    <TableCell>{kpi.owner || "—"}</TableCell>
                    <TableCell>
                      {kpi.targetDisplay}{" "}
                      <span className="text-slate-500">
                        ({formatNumber(kpi.targetNumber)})
                      </span>
                    </TableCell>
                    <TableCell>{formatNumber(kpi.baselineNumber)}</TableCell>
                    <TableCell>
                      <form action={archiveKpiDefinition}>
                        <HiddenDashboard dashboardId={data.dashboard.id} />
                        <input type="hidden" name="kpiId" value={kpi.id} />
                        <Button size="sm" variant="outline" type="submit">
                          <Archive className="h-4 w-4" />
                          Archive
                        </Button>
                      </form>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function SettingsTab({ data }: { data: KpiDashboardData }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Quarter settings</CardTitle>
        <p className="text-sm text-slate-600">
          Assign each month to the quarter that matches your organization&apos;s
          reporting cycle. Every month must belong to exactly one quarter.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <form action={updateKpiQuarterSettings}>
          <HiddenDashboard dashboardId={data.dashboard.id} />
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {monthOptions.map((month) => {
              const assignment = data.quarters.find(
                (quarter) => quarter.monthNumber === month.value,
              );
              return (
                <label
                  className="grid gap-2 rounded-lg border bg-white p-4 text-sm font-semibold"
                  key={month.value}
                >
                  {month.label}
                  <SelectField
                    defaultValue={String(assignment?.quarter ?? 1)}
                    name={`month_${month.value}`}
                    options={quarterValues.map((quarter) => ({
                      label: `Q${quarter}`,
                      value: String(quarter),
                    }))}
                    placeholder="Choose quarter"
                  />
                </label>
              );
            })}
          </div>
          <div className="mt-5 flex flex-wrap gap-3">
            <Button type="submit">
              <Save className="h-4 w-4" />
              Save quarter settings
            </Button>
            <Button
              formAction={resetKpiQuarterSettings}
              type="submit"
              variant="outline"
            >
              Reset to calendar quarters
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

function QuarterTrackerTab({
  data,
  quarter,
}: {
  data: KpiDashboardData;
  quarter: QuarterNumber;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Q{quarter} tracker</CardTitle>
        <p className="text-sm text-slate-600">{getQuarterMonths(data, quarter)}</p>
      </CardHeader>
      <CardContent>
        {data.kpis.length === 0 ? (
          <EmptyState>Add KPIs in Setup & Branding before entering results.</EmptyState>
        ) : (
          <div className="space-y-4">
            {data.kpis.map((kpi) => {
              const result = getResult(data, kpi.id, quarter);
              const percent = calculatePercentToTarget(
                result?.currentValue ?? null,
                kpi.targetNumber,
              );
              const previousResult =
                quarter > 1
                  ? getResult(data, kpi.id, (quarter - 1) as QuarterNumber)
                  : null;
              const trend = calculateTrend(
                result?.currentValue ?? null,
                previousResult?.currentValue ?? null,
              );
              const autoRag = suggestRagStatus(
                result?.currentValue ?? null,
                kpi.targetNumber,
              );

              return (
                <form
                  action={saveKpiQuarterResult}
                  className="rounded-xl border bg-white p-4"
                  key={kpi.id}
                >
                  <HiddenDashboard dashboardId={data.dashboard.id} />
                  <input type="hidden" name="kpiId" value={kpi.id} />
                  <input type="hidden" name="quarter" value={quarter} />
                  <div className="grid gap-4 lg:grid-cols-[1fr_180px_150px_150px_auto] lg:items-end">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                        {kpi.domain}
                      </p>
                      <h3 className="mt-1 text-lg font-bold">{kpi.name}</h3>
                      <p className="text-sm text-slate-600">
                        Target: {kpi.targetDisplay}
                      </p>
                    </div>
                    <label className="block text-sm font-semibold">
                      Current value
                      <Input
                        className="mt-2"
                        defaultValue={result?.currentValue ?? ""}
                        inputMode="decimal"
                        name="currentValue"
                        pattern="\\d+(\\.\\d{1,2})?"
                        placeholder="Numbers only"
                      />
                    </label>
                    <label className="block text-sm font-semibold">
                      RAG
                      <SelectField
                        defaultValue={result?.ragStatus ?? "na"}
                        name="ragStatus"
                        options={ragStatuses.map((status) => ({
                          label: ragLabels[status],
                          value: status,
                        }))}
                        placeholder="Choose status"
                      />
                    </label>
                    <div className="space-y-2 text-sm">
                      <div>
                        Auto-RAG: <RagBadge status={autoRag} />
                      </div>
                      <div>% target: {formatPercent(percent)}</div>
                      <div>Trend: {trend.replace("_", " ")}</div>
                    </div>
                    <Button type="submit">Save result</Button>
                  </div>
                  <label className="mt-4 block text-sm font-semibold">
                    Context notes
                    <Textarea
                      className="mt-2"
                      defaultValue={result?.contextNotes ?? ""}
                      maxLength={1200}
                      name="contextNotes"
                      placeholder="Achievements, issues, data quality notes..."
                    />
                  </label>
                </form>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function BoardDashboardTab({ data }: { data: KpiDashboardData }) {
  return (
    <div className="space-y-5">
      <KpiSummaryCards data={data} />
      <Card>
        <CardHeader>
          <CardTitle>Board dashboard</CardTitle>
          <p className="text-sm text-slate-600">
            Quarterly values are pulled from tracker tabs. The Board sets the
            full-year RAG and notes.
          </p>
        </CardHeader>
        <CardContent>
          {data.kpis.length === 0 ? (
            <EmptyState>No KPIs yet.</EmptyState>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>KPI</TableHead>
                  <TableHead>Q1</TableHead>
                  <TableHead>Q2</TableHead>
                  <TableHead>Q3</TableHead>
                  <TableHead>Q4</TableHead>
                  <TableHead>Variance</TableHead>
                  <TableHead>Full-year RAG</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.kpis.map((kpi) => {
                  const q4Value = getResult(data, kpi.id, 4)?.currentValue ?? null;
                  const variance = calculateVariance(q4Value, kpi.targetNumber);
                  const assessment = getAssessment(data, kpi.id);
                  return (
                    <TableRow key={kpi.id}>
                      <TableCell>
                        <p className="font-semibold">{kpi.name}</p>
                        <p className="text-xs text-slate-500">{kpi.domain}</p>
                      </TableCell>
                      {quarterValues.map((quarter) => (
                        <TableCell key={quarter}>
                          {formatNumber(getResult(data, kpi.id, quarter)?.currentValue)}
                        </TableCell>
                      ))}
                      <TableCell>{formatNumber(variance)}</TableCell>
                      <TableCell className="min-w-[260px]">
                        <form action={saveKpiBoardAssessment} className="space-y-2">
                          <HiddenDashboard dashboardId={data.dashboard.id} />
                          <input type="hidden" name="kpiId" value={kpi.id} />
                          <SelectField
                            defaultValue={assessment?.fullYearRag ?? "na"}
                            name="fullYearRag"
                            options={ragStatuses.map((status) => ({
                              label: ragLabels[status],
                              value: status,
                            }))}
                            placeholder="Choose status"
                          />
                          <Textarea
                            defaultValue={assessment?.boardNotes ?? ""}
                            maxLength={1200}
                            name="boardNotes"
                            placeholder="Board context or override rationale"
                          />
                          <Button size="sm" type="submit">
                            Save
                          </Button>
                        </form>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function MilestonesAndRisksTab({ data }: { data: KpiDashboardData }) {
  return (
    <div className="grid gap-5 xl:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Add milestone</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={createKpiMilestone} className="space-y-4">
            <HiddenDashboard dashboardId={data.dashboard.id} />
            <Input maxLength={160} minLength={2} name="title" placeholder="Milestone" required />
            <div className="grid gap-4 sm:grid-cols-2">
              <Input maxLength={100} name="owner" placeholder="Owner" />
              <Input name="dueDate" type="date" />
            </div>
            <SelectField
              defaultValue="not_started"
              name="status"
              options={milestoneStatuses.map((status) => ({
                label: milestoneLabels[status],
                value: status,
              }))}
              placeholder="Choose status"
            />
            <Textarea maxLength={1200} name="notes" placeholder="Notes" />
            <Button type="submit">Add milestone</Button>
          </form>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Add risk</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={createKpiRisk} className="space-y-4">
            <HiddenDashboard dashboardId={data.dashboard.id} />
            <Input maxLength={100} minLength={2} name="area" placeholder="Risk area" required />
            <Textarea
              maxLength={600}
              minLength={3}
              name="description"
              placeholder="Risk description"
              required
            />
            <Textarea maxLength={1200} name="mitigation" placeholder="Mitigation" />
            <div className="grid gap-4 sm:grid-cols-2">
              <Input maxLength={100} name="owner" placeholder="Owner" />
              <SelectField
                defaultValue="na"
                name="ragStatus"
                options={ragStatuses.map((status) => ({
                  label: ragLabels[status],
                  value: status,
                }))}
                placeholder="Choose RAG"
              />
            </div>
            <Button type="submit">Add risk</Button>
          </form>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Milestones</CardTitle>
        </CardHeader>
        <CardContent>
          {data.milestones.length === 0 ? (
            <EmptyState>No milestones yet.</EmptyState>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Milestone</TableHead>
                  <TableHead>Due</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.milestones.map((milestone) => (
                  <TableRow key={milestone.id}>
                    <TableCell>
                      <p className="font-semibold">{milestone.title}</p>
                      <p className="text-xs text-slate-500">{milestone.owner || "—"}</p>
                    </TableCell>
                    <TableCell>{milestone.dueDate ?? "—"}</TableCell>
                    <TableCell>{milestoneLabels[milestone.status]}</TableCell>
                    <TableCell>
                      <form action={deleteKpiMilestone}>
                        <HiddenDashboard dashboardId={data.dashboard.id} />
                        <input
                          type="hidden"
                          name="milestoneId"
                          value={milestone.id}
                        />
                        <Button size="sm" variant="outline" type="submit">
                          Delete
                        </Button>
                      </form>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Risk register</CardTitle>
        </CardHeader>
        <CardContent>
          {data.risks.length === 0 ? (
            <EmptyState>No risks yet.</EmptyState>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Area</TableHead>
                  <TableHead>Risk</TableHead>
                  <TableHead>RAG</TableHead>
                  <TableHead>Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.risks.map((risk) => (
                  <TableRow key={risk.id}>
                    <TableCell className="font-semibold">{risk.area}</TableCell>
                    <TableCell>
                      <p>{risk.description}</p>
                      <p className="text-xs text-slate-500">
                        Mitigation: {risk.mitigation || "—"}
                      </p>
                    </TableCell>
                    <TableCell>
                      <RagBadge status={risk.ragStatus} />
                    </TableCell>
                    <TableCell>
                      <form action={deleteKpiRisk}>
                        <HiddenDashboard dashboardId={data.dashboard.id} />
                        <input type="hidden" name="riskId" value={risk.id} />
                        <Button size="sm" variant="outline" type="submit">
                          Delete
                        </Button>
                      </form>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function AnnualSummaryTab({ data }: { data: KpiDashboardData }) {
  const fields = [
    ["overview", "Overview"],
    ["achievements", "Key achievements"],
    ["challenges", "Challenges and learning"],
    ["stakeholderStory", "Stakeholder story"],
    ["financialContext", "Financial context"],
    ["riskResponse", "Risk response"],
    ["nextSteps", "Next steps"],
  ] as const;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Annual Summary</CardTitle>
        <p className="text-sm text-slate-600">
          These narrative sections prepare the content for annual impact reporting.
        </p>
      </CardHeader>
      <CardContent>
        <form action={saveKpiAnnualSummary} className="space-y-4">
          <HiddenDashboard dashboardId={data.dashboard.id} />
          {fields.map(([name, label]) => (
            <label className="block text-sm font-semibold" key={name}>
              {label}
              <Textarea
                className="mt-2"
                defaultValue={data.annualSummary[name]}
                maxLength={2000}
                name={name}
                placeholder={`Write ${label.toLowerCase()}...`}
              />
            </label>
          ))}
          <Button type="submit">
            <Save className="h-4 w-4" />
            Save annual summary
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

export function KpiDashboardWorkspace({
  activeTab,
  data,
}: {
  activeTab: string;
  data: KpiDashboardData;
}) {
  const safeTab = tabOptions.some((tab) => tab.value === activeTab)
    ? activeTab
    : "setup";

  return (
    <div className="space-y-5">
      <Card className="border-olea-green/15 bg-gradient-to-br from-white to-olea-light/50 shadow-soft">
        <CardContent className="p-5">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-olea-green">
                KPI Dashboard
              </p>
              <h1 className="mt-2 text-3xl font-bold text-slate-950">
                {data.dashboard.title}
              </h1>
              <p className="mt-2 text-slate-600">
                {data.dashboard.organizationName} · Reporting year{" "}
                {data.dashboard.reportingYear}
              </p>
            </div>
            <div className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-slate-600 shadow-sm">
              {data.kpis.length} KPI{data.kpis.length === 1 ? "" : "s"} tracked
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue={safeTab}>
        <div className="overflow-x-auto rounded-xl border bg-white p-2 shadow-soft">
          <TabsList className="h-auto min-w-max justify-start gap-1 bg-olea-light/70 p-1">
            {tabOptions.map((tab) => (
              <TabsTrigger
                className="data-[state=active]:bg-white data-[state=active]:text-olea-green"
                key={tab.value}
                value={tab.value}
              >
                {tab.value === "settings" && <Settings className="mr-2 h-4 w-4" />}
                {tab.value === "board" && <BarChart3 className="mr-2 h-4 w-4" />}
                {tab.value === "milestones" && (
                  <ClipboardList className="mr-2 h-4 w-4" />
                )}
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        <TabsContent value="setup">
          <SetupTab data={data} />
        </TabsContent>
        <TabsContent value="settings">
          <SettingsTab data={data} />
        </TabsContent>
        {quarterValues.map((quarter) => (
          <TabsContent key={quarter} value={`q${quarter}`}>
            <QuarterTrackerTab data={data} quarter={quarter} />
          </TabsContent>
        ))}
        <TabsContent value="board">
          <BoardDashboardTab data={data} />
        </TabsContent>
        <TabsContent value="milestones">
          <MilestonesAndRisksTab data={data} />
        </TabsContent>
        <TabsContent value="annual">
          <AnnualSummaryTab data={data} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
