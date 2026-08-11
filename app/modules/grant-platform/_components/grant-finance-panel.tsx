"use client";

import {
  AlertTriangle,
  Award,
  Calendar,
  CheckCircle2,
  Clock,
  DollarSign,
  FileText,
  PieChart,
  ReceiptText,
  ShieldCheck,
  TrendingUp,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function GrantFinancePanel() {
  const statCards = [
    {
      label: "Total Requested",
      count: "$177,000",
      subtext: "5 active grants",
      color: "text-navy-blue",
      icon: DollarSign,
    },
    {
      label: "Awarded (Approved)",
      count: "$42,000",
      subtext: "24% of requested",
      color: "text-olea-green",
      icon: Award,
    },
    {
      label: "Pending Decision",
      count: "$50,000",
      subtext: "1 grant applied",
      color: "text-orange-600",
      icon: Clock,
    },
    {
      label: "Funding Received (Cash)",
      count: "$25,000",
      subtext: "59% of awarded",
      color: "text-emerald-600",
      icon: CheckCircle2,
    },
  ];

  const fundingStatusRows = [
    {
      name: "BC Community Gaming Grant",
      status: "In Progress",
      statusBadgeClass: "bg-amber-500 text-white",
      requested: "$50,000",
      awarded: "-",
      received: "-",
      percent: "-",
    },
    {
      name: "Arts Futures Fund",
      status: "Planning",
      statusBadgeClass: "bg-blue-500 text-white",
      requested: "$35,000",
      awarded: "-",
      received: "-",
      percent: "-",
    },
    {
      name: "Youth Leadership Initiative",
      status: "Approved",
      statusBadgeClass: "bg-olea-green text-white",
      requested: "$42,000",
      awarded: "$42,000",
      received: "$25,000",
      percent: "59%",
      highlight: true,
    },
    {
      name: "Health & Wellness Program",
      status: "Declined",
      statusBadgeClass: "bg-slate-400 text-white",
      requested: "$65,000",
      awarded: "-",
      received: "-",
      percent: "-",
    },
  ];

  const upcomingObligations = [
    {
      type: "Payment Received",
      grant: "Youth Leadership Initiative: $25,000 (1st installment)",
      statusNote: "Received Jan 15",
      borderColor: "border-olea-green",
      bgColor: "bg-olea-light/40",
      textColor: "text-olea-green",
    },
    {
      type: "Report Deadline",
      grant: "Youth Leadership Initiative: Interim Report due",
      statusNote: "Due Jun 20",
      borderColor: "border-navy-blue",
      bgColor: "bg-slate-50",
      textColor: "text-navy-blue",
    },
    {
      type: "Final Payment Due",
      grant: "Youth Leadership Initiative: $17,000 (2nd installment)",
      statusNote: "Due Dec 20",
      borderColor: "border-emerald-500",
      bgColor: "bg-emerald-50",
      textColor: "text-emerald-700",
    },
    {
      type: "Funder Decision Expected",
      grant: "Decision expected on $50,000 application",
      statusNote: "70 days away",
      borderColor: "border-orange-500",
      bgColor: "bg-orange-50",
      textColor: "text-orange-600",
    },
  ];

  const financialInsights = [
    {
      title: "Win Rate",
      text: "1 approved out of 3 decisions = 33% success rate",
      detail: "Industry average: 20-25% - you're above average!",
      borderColor: "border-olea-green",
      icon: CheckCircle2,
    },
    {
      title: "Cash Flow Alert",
      text: "59% of awarded funds received. Remaining $17K due by Dec 2026.",
      detail: "Plan: Budget this final installment for Q4.",
      borderColor: "border-orange-500",
      icon: AlertTriangle,
    },
    {
      title: "Funding Conversion",
      text: "Requested: $177K | Awarded: $42K (24%)",
      detail: "Pending: $50K more could close gap to 43%",
      borderColor: "border-blue-500",
      icon: TrendingUp,
    },
    {
      title: "Funder Performance",
      text: "Community Foundation: 100% success rate (1/1)",
      detail: "Province of BC: 0% (1 pending). Keep trying!",
      borderColor: "border-emerald-500",
      icon: PieChart,
    },
  ];

  const budgetBreakdown = [
    {
      category: "Staff Salaries",
      used: 18000,
      total: 20000,
      color: "bg-olea-green",
      textColor: "text-olea-green",
      percent: 90,
    },
    {
      category: "Program Materials",
      used: 8000,
      total: 12000,
      color: "bg-orange-500",
      textColor: "text-orange-600",
      percent: 67,
    },
    {
      category: "Evaluation & Reporting",
      used: 5000,
      total: 10000,
      color: "bg-blue-500",
      textColor: "text-blue-600",
      percent: 50,
    },
  ];

  const financeDirectorResponsibilities = [
    "Monitor cash flow - Know when money comes in",
    "Track budget compliance - Make sure grants stay on budget",
    "Manage financial deadlines - Reports due to funders",
    "Record payments received - Update status as money arrives",
    "Forecast future funding - Plan for pipeline grants",
    "Alert on overages - Flag if grant spending exceeds budget",
    "Prepare financial reports - For board, funder reporting",
    "Track funder compliance - Know what each funder requires",
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <ReceiptText className="size-6 text-navy-blue" />
        <h2 className="text-2xl font-bold text-navy-blue">Funding & Budget Overview</h2>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.label} className="shadow-soft">
              <CardContent className="p-4">
                <div className="flex items-center justify-between text-slate-500">
                  <span className="text-xs font-semibold uppercase tracking-wider">{stat.label}</span>
                  <Icon className="size-4 text-slate-400" />
                </div>
                <div className={`mt-2 text-2xl font-extrabold ${stat.color}`}>{stat.count}</div>
                <p className="mt-1 text-xs text-slate-500">{stat.subtext}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Grant Funding Status Table */}
      <Card className="shadow-soft">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <PieChart className="size-5 text-olea-green" />
            Grant Funding Status
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <div className="min-w-[650px]">
              <div className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr_1fr] bg-accent-gray/60 px-4 py-3 text-xs font-bold uppercase tracking-wider text-navy-blue">
                <div>Grant Name</div>
                <div>Status</div>
                <div>Requested</div>
                <div>Awarded</div>
                <div>Received</div>
                <div>% Received</div>
              </div>
              <div className="divide-y divide-slate-100">
                {fundingStatusRows.map((row) => (
                  <div
                    key={row.name}
                    className={`grid grid-cols-[2fr_1fr_1fr_1fr_1fr_1fr] items-center px-4 py-3 text-sm ${
                      row.highlight ? "bg-emerald-50/30" : ""
                    }`}
                  >
                    <div className="font-semibold text-navy-blue">{row.name}</div>
                    <div>
                      <span className={`rounded px-2 py-0.5 text-xs font-bold ${row.statusBadgeClass}`}>
                        {row.status}
                      </span>
                    </div>
                    <div className="text-slate-700">{row.requested}</div>
                    <div className={row.highlight ? "font-bold text-olea-green" : "text-slate-500"}>{row.awarded}</div>
                    <div className={row.highlight ? "font-bold text-olea-green" : "text-slate-500"}>{row.received}</div>
                    <div className={row.highlight ? "font-bold text-olea-green" : "text-slate-400"}>{row.percent}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Payment Schedule & Financial Insights Grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Payment Schedule */}
        <Card className="shadow-soft">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Calendar className="size-5 text-olea-green" />
              Payment Schedule & Compliance
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {upcomingObligations.map((item, idx) => (
              <div key={idx} className={`rounded-lg border-l-4 ${item.borderColor} ${item.bgColor} p-3 text-xs space-y-1`}>
                <div className="flex items-center justify-between font-bold text-slate-900">
                  <span>{item.type}</span>
                  <span className={item.textColor}>{item.statusNote}</span>
                </div>
                <p className="text-slate-600">{item.grant}</p>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Financial Insights */}
        <Card className="shadow-soft">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <TrendingUp className="size-5 text-olea-green" />
              Financial Insights
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {financialInsights.map((insight, idx) => {
              const Icon = insight.icon;
              return (
                <div key={idx} className={`rounded-lg border-l-4 ${insight.borderColor} bg-slate-50 p-3 text-xs space-y-1`}>
                  <div className="flex items-center gap-1.5 font-bold text-slate-900">
                    <Icon className="size-4 text-olea-green" />
                    <span>{insight.title}</span>
                  </div>
                  <p className="text-slate-700 font-medium">{insight.text}</p>
                  <p className="text-slate-500">{insight.detail}</p>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>

      {/* Budget Breakdown by Grant & Finance Director SOP */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Itemized Budget Tracking */}
        <Card className="shadow-soft">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <FileText className="size-5 text-olea-green" />
              Budget Tracking (Youth Leadership Initiative - $42K)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {budgetBreakdown.map((b) => (
              <div key={b.category} className="space-y-1.5">
                <div className="flex justify-between text-xs font-semibold">
                  <span className="text-slate-800">{b.category}</span>
                  <span className={b.textColor}>
                    ${b.used.toLocaleString()} / ${b.total.toLocaleString()} ({b.percent}%)
                  </span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                  <div className={`h-full ${b.color}`} style={{ width: `${b.percent}%` }} />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Finance Director Checklist */}
        <Card className="border-l-4 border-olea-green shadow-soft">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <ShieldCheck className="size-5 text-olea-green" />
              For Finance Director
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-xs text-slate-700">
              {financeDirectorResponsibilities.map((item, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <CheckCircle2 className="size-4 shrink-0 text-olea-green mt-0.5" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
