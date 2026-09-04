"use client";

import { Pencil, Trash2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import {
  getAgmMilestoneRowKey,
  getNumber,
  getString,
  StatusBadge,
  type TemplateRecord,
} from "./workflow-utils";

export function AgmMilestoneTable({
  milestones,
  onEditMilestone,
  onRemoveMilestone,
}: {
  milestones: Array<{ milestone: TemplateRecord; index: number }>;
  onEditMilestone: (index: number) => void;
  onRemoveMilestone: (index: number) => void;
}) {
  return (
    <div className="rounded-xl border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Task / deliverable</TableHead>
            <TableHead>Track</TableHead>
            <TableHead>Days before</TableHead>
            <TableHead>Target date</TableHead>
            <TableHead>Responsible</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="w-[120px]">Notes</TableHead>
            <TableHead className="w-[90px]">Done</TableHead>
            <TableHead className="w-[210px] text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {milestones.map(({ milestone, index }) => (
            <TableRow key={getAgmMilestoneRowKey(milestone, index)}>
              <TableCell className="min-w-[220px] font-semibold text-slate-950">
                {getString(milestone, "task") || "Untitled milestone"}
              </TableCell>
              <TableCell className="min-w-[140px] text-slate-700">
                {getString(milestone, "track") || "Governance"}
              </TableCell>
              <TableCell className="whitespace-nowrap text-slate-700">
                {getNumber(milestone, "days_before")}
              </TableCell>
              <TableCell className="whitespace-nowrap text-slate-700">
                {getString(milestone, "calculated_date") || "No target date"}
              </TableCell>
              <TableCell className="min-w-[160px] text-slate-700">
                {getString(milestone, "responsible") || "Unassigned"}
              </TableCell>
              <TableCell>
                <StatusBadge status={getString(milestone, "status")} />
              </TableCell>
              <TableCell className="whitespace-nowrap text-slate-500">
                {getString(milestone, "notes") ? (
                  <Badge
                    variant="outline"
                    className="border-olea-green/20 bg-olea-light text-olea-dark"
                  >
                    Has notes
                  </Badge>
                ) : (
                  "—"
                )}
              </TableCell>
              <TableCell className="whitespace-nowrap text-slate-600">
                {milestone.done ? "Yes" : "No"}
              </TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    aria-label={`Edit AGM milestone ${index + 1}`}
                    onClick={() => onEditMilestone(index)}
                  >
                    <Pencil className="size-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="text-red-700 hover:bg-red-50 hover:text-red-800"
                    aria-label={`Remove AGM milestone ${index + 1}`}
                    onClick={() => onRemoveMilestone(index)}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
