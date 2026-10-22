import { Save } from "lucide-react";

import {
  resetKpiQuarterSettings,
  updateKpiDashboardSettings,
  updateKpiQuarterSettings,
} from "@/app/modules/kpi-dashboard/actions";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { SubmitButton } from "@/components/ui/submit-button";
import type { KpiDashboardData } from "@/lib/data/kpi-dashboard";
import { monthOptions } from "@/lib/kpi-dashboard/domain";

import { FieldHint, HiddenDashboard, SelectField, quarterValues } from "./kpi-dashboard-ui";

export function SetupTab({ data }: { data: KpiDashboardData }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Dashboard setup</CardTitle>
        <CardDescription className="mt-2">
          Update the report title, reporting year, and fiscal year details.{" "}
          KPIs are added from the Q1-Q4 tracker tabs.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <DashboardSetupForm data={data} />
      </CardContent>
    </Card>
  );
}

export function SettingsTab({ data }: { data: KpiDashboardData }) {
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
            {monthOptions.map((month) => (
              <QuarterMonthField data={data} key={month.value} month={month} />
            ))}
          </div>
          <div className="mt-5 flex flex-wrap gap-3">
            <SubmitButton pendingText="Saving settings...">
              <Save className="h-4 w-4" />
              Save quarter settings
            </SubmitButton>
            <SubmitButton
              formAction={resetKpiQuarterSettings}
              pendingText="Resetting..."
              variant="outline"
            >
              Reset to calendar quarters
            </SubmitButton>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

function DashboardSetupForm({ data }: { data: KpiDashboardData }) {
  return (
    <form action={updateKpiDashboardSettings} className="space-y-4">
      <HiddenDashboard dashboardId={data.dashboard.id} />
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
            step={1}
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
            required
            type="date"
          />
          <FieldHint>Choose the date your reporting year ends.</FieldHint>
        </label>
      </div>
      <SubmitButton pendingText="Saving setup...">
        <Save className="h-4 w-4" />
        Save setup
      </SubmitButton>
    </form>
  );
}

function QuarterMonthField({
  data,
  month,
}: {
  data: KpiDashboardData;
  month: (typeof monthOptions)[number];
}) {
  const assignment = data.quarters.find(
    (quarter) => quarter.monthNumber === month.value,
  );

  return (
    <label className="grid gap-2 rounded-lg border bg-white p-4 text-sm font-semibold">
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
}
