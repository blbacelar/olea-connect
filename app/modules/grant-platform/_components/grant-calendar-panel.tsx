"use client";

import { CalendarClock, CalendarDays, ExternalLink } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { GrantPlatformWorkspaceData } from "@/lib/data/grant-platform";

type CalendarItem = {
  id: string;
  deadline: string;
  funder: string;
  grantName: string;
  opensAt: string | null;
  status: string;
};

function formatDate(value: string | null) {
  if (!value) return "Date not set";
  return new Date(`${value}T00:00:00`).toLocaleDateString("en-CA", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function daysUntil(value: string) {
  const today = new Date();
  const target = new Date(`${value}T00:00:00`);
  today.setHours(0, 0, 0, 0);
  const diff = Math.ceil((target.getTime() - today.getTime()) / 86_400_000);
  if (diff === 0) return "Due today";
  if (diff > 0) return `Due in ${diff} day${diff === 1 ? "" : "s"}`;
  return `Closed ${Math.abs(diff)} day${Math.abs(diff) === 1 ? "" : "s"} ago`;
}

function statusClass(item: CalendarItem) {
  if (item.status === "open") return "bg-blue-100 text-blue-800";
  if (item.status === "closed") return "bg-slate-100 text-slate-700";
  return "bg-amber-100 text-amber-800";
}

function workspaceItems(data: GrantPlatformWorkspaceData): CalendarItem[] {
  return data.applications
    .filter((application) => application.deadlineAt)
    .map((application) => ({
      id: application.id,
      deadline: application.deadlineAt?.slice(0, 10) ?? "",
      funder: application.funderName,
      grantName: application.roundName,
      opensAt: null,
      status: application.status,
    }));
}

export function GrantCalendarPanel({
  data,
}: {
  data: GrantPlatformWorkspaceData;
}) {
  const items = workspaceItems(data).sort((left, right) =>
    left.deadline.localeCompare(right.deadline),
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <CalendarDays className="size-6 text-navy-blue" />
        <h2 className="text-2xl font-bold text-navy-blue">Grant deadlines</h2>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white p-4 text-sm text-slate-600">
        <p>External B.C. grant intake dates are not synced here. Check the current official schedule before planning an application.</p>
        <Button asChild type="button" variant="outline">
          <a href="https://www2.gov.bc.ca/gov/content/sports-culture/gambling-fundraising/gaming-grants/community-gaming-grants" rel="noopener noreferrer" target="_blank">
            B.C. program dates <ExternalLink className="ml-2 size-4" />
          </a>
        </Button>
      </div>

      <Card className="shadow-soft">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <CalendarClock className="size-5 text-olea-green" />
            Upcoming milestones and submission deadlines
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {items.map((item) => (
            <div
              key={item.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50/60 p-4 transition-colors hover:bg-slate-100/60"
            >
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-bold text-slate-900">{item.grantName}</p>
                  <Badge className={`text-xs ${statusClass(item)}`}>
                    {item.status}
                  </Badge>
                </div>
                <p className="text-xs text-slate-500">{item.funder}</p>
                {item.opensAt ? (
                  <p className="text-xs text-slate-500">
                    Opens {formatDate(item.opensAt)}
                  </p>
                ) : null}
              </div>

              <div className="text-right">
                <p className="text-sm font-bold text-orange-600">
                  {formatDate(item.deadline)}
                </p>
                <p className="text-xs text-slate-500">{daysUntil(item.deadline)}</p>
              </div>
            </div>
          ))}
          {!items.length ? (
            <p className="text-sm text-slate-600">No deadlines saved yet. Add a grant in Pipeline to track it here.</p>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
