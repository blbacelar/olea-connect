"use client";

import { CalendarClock, CalendarDays, CheckCircle2, Clock } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function GrantCalendarPanel() {
  const deadlines = [
    {
      grantName: "BC Community Gaming Grant - Arts",
      funder: "Province of BC",
      deadline: "Apr 30, 2026",
      dueIn: "Due in ~67 days",
      status: "In Progress",
      statusBadgeClass: "bg-blue-100 text-blue-800",
      urgencyColor: "text-orange-600 font-bold",
    },
    {
      grantName: "Arts Futures Fund",
      funder: "Arts Council of BC",
      deadline: "May 15, 2026",
      dueIn: "Due in ~82 days",
      status: "Planning",
      statusBadgeClass: "bg-amber-100 text-amber-800",
      urgencyColor: "text-orange-600 font-bold",
    },
    {
      grantName: "Youth Leadership Initiative (Interim Report)",
      funder: "Community Foundation",
      deadline: "Jun 20, 2026",
      dueIn: "Due in ~118 days",
      status: "Report Due",
      statusBadgeClass: "bg-purple-100 text-purple-800",
      urgencyColor: "text-purple-600 font-bold",
    },
    {
      grantName: "Youth Leadership Initiative (Final Report)",
      funder: "Community Foundation",
      deadline: "Dec 20, 2026",
      dueIn: "Due in ~300 days",
      status: "Report Due",
      statusBadgeClass: "bg-purple-100 text-purple-800",
      urgencyColor: "text-slate-600 font-medium",
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <CalendarDays className="size-6 text-navy-blue" />
        <h2 className="text-2xl font-bold text-navy-blue">Grant Deadlines</h2>
      </div>

      <Card className="shadow-soft">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <CalendarClock className="size-5 text-olea-green" />
            Upcoming Milestones & Submission Deadlines
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {deadlines.map((item) => (
            <div
              key={item.grantName}
              className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50/60 p-4 transition-colors hover:bg-slate-100/60"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <p className="font-bold text-slate-900 text-sm">{item.grantName}</p>
                  <Badge className={`text-xs ${item.statusBadgeClass}`}>{item.status}</Badge>
                </div>
                <p className="text-xs text-slate-500">{item.funder}</p>
              </div>

              <div className="text-right">
                <p className={`text-sm ${item.urgencyColor}`}>{item.deadline}</p>
                <p className="text-xs text-slate-500">{item.dueIn}</p>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
