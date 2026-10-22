import {
  DeleteMilestoneDialogAction,
  DeleteRiskDialogAction,
  MilestoneDialogAction,
  RiskDialogAction,
} from "@/app/modules/kpi-dashboard/_components/milestones-risks-actions";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { KpiDashboardData } from "@/lib/data/kpi-dashboard";
import { milestoneLabels } from "@/lib/kpi-dashboard/domain";

import { EmptyState, RagBadge } from "./kpi-dashboard-ui";

export function MilestonesAndRisksTab({ data }: { data: KpiDashboardData }) {
  return (
    <div className="space-y-5">
      <MilestonesCard data={data} />
      <RisksCard data={data} />
    </div>
  );
}

function MilestonesCard({ data }: { data: KpiDashboardData }) {
  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle>Milestones</CardTitle>
            <CardDescription>
              Track completion milestones and board reporting checkpoints.
            </CardDescription>
          </div>
          <MilestoneDialogAction dashboardId={data.dashboard.id} />
        </div>
      </CardHeader>
      <CardContent>
        {data.milestones.length === 0 ? <EmptyState>No milestones yet.</EmptyState> : null}
        {data.milestones.length > 0 ? <MilestonesTable data={data} /> : null}
      </CardContent>
    </Card>
  );
}

function MilestonesTable({ data }: { data: KpiDashboardData }) {
  return (
    <div
      className="scrollbar-hide overflow-x-auto rounded-xl border"
      data-testid="kpi-milestones-table"
    >
      <Table>
        <caption className="sr-only">
          KPI dashboard milestone list with owner, due date, status, notes, and
          row actions.
        </caption>
        <TableHeader>
          <TableRow>
            <TableHead>Milestone</TableHead>
            <TableHead>Owner</TableHead>
            <TableHead>Due</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Notes</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.milestones.map((milestone) => (
            <TableRow key={milestone.id}>
              <TableCell className="font-semibold">{milestone.title}</TableCell>
              <TableCell>{milestone.owner || "—"}</TableCell>
              <TableCell>{milestone.dueDate ?? "—"}</TableCell>
              <TableCell>{milestoneLabels[milestone.status]}</TableCell>
              <TableCell>
                <TruncatedTableText>{milestone.notes}</TruncatedTableText>
              </TableCell>
              <TableCell>
                <div className="flex justify-end gap-2">
                  <MilestoneDialogAction
                    dashboardId={data.dashboard.id}
                    milestone={milestone}
                  />
                  <DeleteMilestoneDialogAction
                    dashboardId={data.dashboard.id}
                    milestone={milestone}
                  />
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function RisksCard({ data }: { data: KpiDashboardData }) {
  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle>Risk register</CardTitle>
            <CardDescription>
              Capture board-visible risks, mitigations, ownership, and RAG
              status.
            </CardDescription>
          </div>
          <RiskDialogAction dashboardId={data.dashboard.id} />
        </div>
      </CardHeader>
      <CardContent>
        {data.risks.length === 0 ? <EmptyState>No risks yet.</EmptyState> : null}
        {data.risks.length > 0 ? <RisksTable data={data} /> : null}
      </CardContent>
    </Card>
  );
}

function RisksTable({ data }: { data: KpiDashboardData }) {
  return (
    <div
      className="scrollbar-hide overflow-x-auto rounded-xl border"
      data-testid="kpi-risks-table"
    >
      <Table>
        <caption className="sr-only">
          KPI dashboard risk register with area, risk, mitigation, owner, RAG
          status, and row actions.
        </caption>
        <TableHeader>
          <TableRow>
            <TableHead>Area</TableHead>
            <TableHead>Risk</TableHead>
            <TableHead>Mitigation</TableHead>
            <TableHead>Owner</TableHead>
            <TableHead>RAG</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.risks.map((risk) => (
            <TableRow key={risk.id}>
              <TableCell className="font-semibold">{risk.area}</TableCell>
              <TableCell>
                <TruncatedTableText>{risk.description}</TruncatedTableText>
              </TableCell>
              <TableCell>
                <TruncatedTableText>{risk.mitigation}</TruncatedTableText>
              </TableCell>
              <TableCell>{risk.owner || "—"}</TableCell>
              <TableCell>
                <RagBadge status={risk.ragStatus} />
              </TableCell>
              <TableCell>
                <div className="flex justify-end gap-2">
                  <RiskDialogAction dashboardId={data.dashboard.id} risk={risk} />
                  <DeleteRiskDialogAction dashboardId={data.dashboard.id} risk={risk} />
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function TruncatedTableText({ children }: { children: React.ReactNode }) {
  return (
    <p className="max-w-[340px] truncate text-sm text-slate-500">
      {children || "—"}
    </p>
  );
}
