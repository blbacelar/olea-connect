import {
  AlertTriangle,
  ClipboardCheck,
  FileCheck2,
} from "lucide-react";
import type { ReactNode } from "react";

import type { AccreditationActionResult } from "@/app/modules/accreditation/actions";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  isResponseComplete,
} from "@/lib/accreditation/domain";
import type { AccreditationTemplateResponse } from "@/lib/accreditation/types";
import { cn } from "@/lib/utils";

export const accreditationTabs = [
  "dashboard",
  "library",
  "editor",
  "settings",
] as const;

export type AccreditationTab = (typeof accreditationTabs)[number];

export const teamRoleOptions = [
  "Board Chair",
  "Executive Director",
  "Treasurer / Finance Lead",
  "HR Lead",
  "Fundraising Lead",
  "Volunteer Manager",
  "Governance Committee",
];

export function resolveTab(
  value: string | undefined,
  configured: boolean,
): AccreditationTab {
  if (!configured) return "settings";
  if (accreditationTabs.includes(value as AccreditationTab)) {
    return value as AccreditationTab;
  }
  return "dashboard";
}

export function completedCount(responses: AccreditationTemplateResponse[]) {
  return responses.filter(isResponseComplete).length;
}

export function completionPercent(
  responses: AccreditationTemplateResponse[],
  total: number,
) {
  if (total <= 0) return 0;
  return Math.round((completedCount(responses) / total) * 100);
}

export function fieldError(state: AccreditationActionResult, field: string) {
  if (state.ok) return undefined;
  return state.fieldErrors?.[field]?.[0];
}

export function MetricCard({
  label,
  testId,
  value,
}: {
  label: string;
  testId?: string;
  value: string;
}) {
  return (
    <Card data-testid={testId}>
      <CardContent className="p-5">
        <p className="text-sm font-bold uppercase tracking-[0.16em] text-slate-400">
          {label}
        </p>
        <p className="mt-3 text-4xl font-bold text-slate-950">{value}</p>
      </CardContent>
    </Card>
  );
}

export function Field({
  children,
  error,
  label,
}: {
  children: ReactNode;
  error?: string;
  label: string;
}) {
  return (
    <div>
      <Label>{label}</Label>
      <div className="mt-2">{children}</div>
      {error ? (
        <p className="mt-1 text-sm font-semibold text-red-600">{error}</p>
      ) : null}
    </div>
  );
}

export function ProgressRing({ percent }: { percent: number }) {
  return (
    <div className="rounded-2xl border bg-white p-4 text-center shadow-sm">
      <FileCheck2 className="mx-auto size-6 text-olea-green" />
      <p className="mt-2 text-3xl font-bold text-slate-950">{percent}%</p>
      <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400">
        Complete
      </p>
    </div>
  );
}

export function InfoPanel({
  items,
  title,
  warning,
}: {
  items: string[];
  title: string;
  warning?: boolean;
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <h3
          className={cn(
            "text-sm font-bold uppercase tracking-[0.16em]",
            warning ? "text-amber-700" : "text-olea-green",
          )}
        >
          {title}
        </h3>
        <ul className="mt-3 space-y-2 text-sm leading-6 text-slate-600">
          {items.map((item) => (
            <li key={item} className="flex gap-2">
              {warning ? (
                <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-600" />
              ) : (
                <ClipboardCheck className="mt-0.5 size-4 shrink-0 text-olea-green" />
              )}
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

export function CompletionBadge({ complete }: { complete: boolean }) {
  return complete ? (
    <Badge className="bg-olea-green text-white">Complete</Badge>
  ) : (
    <Badge variant="outline">In progress</Badge>
  );
}
