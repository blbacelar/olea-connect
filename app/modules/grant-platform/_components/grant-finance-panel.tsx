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
      statusBadgeClass: "bg-emerald-500 text-white",
      requested: "$45,000",
      awarded: "$42,000",
      received: "$25,000",
      percent: "59%",
      highlight: true,
    },
    {
      name: "Health & Wellness Program",
      status: "Declined",
      statusBadgeClass: "bg-rose-500 text-white",
      requested: "$65,000",
      awarded: "-",
      received: "-",
      percent: "-",
    },
  ];

  const upcomingObligations = [
    {
      title: "Interim Report Due: Jun 20, 2026",
      grant: "Youth Leadership Initiative - $42,000 approved",
      statusNote: "✓ Expected: First installment already received ($25K)",
      borderColor: "border-olea-green",
      bgColor: "bg-olea-light/40",
      textColor: "text-olea-green",
    },
    {
      title: "Final Report Due: Dec 20, 2026",
      grant: "Youth Leadership Initiative - Final disbursement",
      statusNote: "⏳ Expected: Final payment of $17,000 on completion",
      borderColor: "border-olea-green",
      bgColor: "bg-olea-light/40",
      textColor: "text-amber-600",
    },
    {
      title: "BC Community Gaming Grant Decision: by Apr 30, 2026",
      grant: "Decision expected on $50,000 application",
      statusNote: "⏰ 70 days away",
      borderColor: "border-orange-500",
      bgColor: "bg-orange-50",
      textColor: "text-orange-600",
    },
  ];

  const financialInsights = [
    {
      title: "✅ Win Rate",
      text: "1 approved out of 3 decisions = 33% success rate",
      detail: "Industry average: 20-25% - you're above average!",
      borderColor: "border-olea-green",
    },
    {
      title: "⚠️ Cash Flow Alert",
      text: "59% of awarded funds received. Remaining $17K due by Dec 2026.",
      detail: "Plan: Budget this final installment for Q4.",
      borderColor: "border-orange-500",
    },
    {
      title: "🎯 Funding Conversion",
      text: "Requested: $177K | Awarded: $42K (24%)",
      detail: "Pending: $50K more could close gap to 43%",
      borderColor: "border-blue-500",
    },
    {
      title: "📊 Funder Performance",
      text: "Community Foundation: 100% success rate (1/1)",
      detail: "Province of BC: 0% (1 pending). Keep trying!",
      borderColor: "border-emerald-500",
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
      <h2 className="text-2xl font-bold text-navy-blue">💰 Funding & Budget Overview</h2>

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
            📊 Grant Funding Status
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

      {/* Payment Schedule & Compliance */}
      <Card className="shadow-soft">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Calendar className="size-5 text-olea-green" />
            📅 Payment Schedule & Compliance
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-xs font-bold uppercase tracking-wider text-navy-blue">Upcoming Financial Obligations</p>
          {upcomingObligations.map((ob, idx) => (
            <div key={idx} className={`rounded-lg border-l-4 ${ob.borderColor} ${ob.bgColor} p-3 text-xs space-y-1`}>
              <p className="font-bold text-slate-900">{ob.title}</p>
              <p className="text-slate-600">{ob.grant}</p>
              <p className={`font-semibold ${ob.textColor}`}>{ob.statusNote}</p>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Financial Insights */}
      <div className="space-y-3">
        <h3 className="flex items-center gap-2 text-lg font-bold text-navy-blue">
          <TrendingUp className="size-5 text-olea-green" />
          💡 Financial Insights
        </h3>
        <div className="grid gap-4 md:grid-cols-2">
          {financialInsights.map((insight) => (
            <Card key={insight.title} className={`border-l-4 ${insight.borderColor} shadow-soft`}>
              <CardContent className="p-4 space-y-1.5 text-xs">
                <p className="font-bold text-sm text-navy-blue">{insight.title}</p>
                <p className="text-slate-700">{insight.text}</p>
                <p className="text-slate-500">{insight.detail}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Budget Tracking by Grant */}
      <Card className="shadow-soft">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <FileText className="size-5 text-olea-green" />
            📄 Budget Tracking by Grant
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg border border-slate-200 bg-white p-4 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <span className="font-bold text-navy-blue">Youth Leadership Initiative</span>
              <Badge className="bg-emerald-100 text-emerald-800">$42,000 Approved</Badge>
            </div>

            <div className="space-y-3">
              {budgetBreakdown.map((item) => (
                <div key={item.category} className="space-y-1">
                  <div className="flex justify-between text-xs font-medium">
                    <span className="text-slate-800">{item.category}</span>
                    <span className={`font-bold ${item.textColor}`}>
                      ${item.used.toLocaleString()} / ${item.total.toLocaleString()}
                    </span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                    <div className={`h-full ${item.color}`} style={{ width: `${item.percent}%` }} />
                  </div>
                </div>
              ))}
            </div>

            <div className="border-t border-slate-100 pt-3 text-right text-xs">
              <p className="font-bold text-slate-900">Total Used: $31,000 / $42,000 (74%)</p>
              <p className="text-slate-500">$11,000 remaining for final expenses</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* For Finance Director Box */}
      <Card className="border-l-4 border-navy-blue bg-slate-50 shadow-soft">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base text-navy-blue">
            <ShieldCheck className="size-5 text-navy-blue" />
            📋 For Finance Director
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="mb-3 text-xs font-semibold text-slate-700">Key Responsibilities Tracked Here:</p>
          <div className="grid gap-2 text-xs text-slate-600 md:grid-cols-2">
            {financeDirectorResponsibilities.map((resp, i) => (
              <div key={i} className="flex items-center gap-2">
                <CheckCircle2 className="size-3.5 text-olea-green shrink-0" />
                <span>{resp}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
