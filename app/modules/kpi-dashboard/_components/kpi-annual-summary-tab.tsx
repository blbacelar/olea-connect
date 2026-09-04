import { Save } from "lucide-react";

import { saveKpiAnnualSummary } from "@/app/modules/kpi-dashboard/actions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SubmitButton } from "@/components/ui/submit-button";
import { Textarea } from "@/components/ui/textarea";
import type { KpiDashboardData } from "@/lib/data/kpi-dashboard";

import { HiddenDashboard } from "./kpi-dashboard-ui";

const annualSummaryFields = [
  ["overview", "Overview"],
  ["achievements", "Key achievements"],
  ["challenges", "Challenges and learning"],
  ["stakeholderStory", "Stakeholder story"],
  ["financialContext", "Financial context"],
  ["riskResponse", "Risk response"],
  ["nextSteps", "Next steps"],
] as const;

export function AnnualSummaryTab({ data }: { data: KpiDashboardData }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Annual Summary</CardTitle>
        <p className="text-sm text-slate-600">
          These narrative sections prepare the content for annual impact reporting.
        </p>
      </CardHeader>
      <CardContent>
        <form
          action={saveKpiAnnualSummary}
          className="grid gap-4 md:grid-cols-2"
          data-testid="annual-summary-form"
        >
          <HiddenDashboard dashboardId={data.dashboard.id} />
          {annualSummaryFields.map(([name, label]) => (
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
          <SubmitButton className="md:col-span-2" pendingText="Saving summary...">
            <Save className="h-4 w-4" />
            Save annual summary
          </SubmitButton>
        </form>
      </CardContent>
    </Card>
  );
}
