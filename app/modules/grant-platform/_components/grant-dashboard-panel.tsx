"use client";

import {
  Award,
  BarChart3,
  CheckCircle2,
  Clock,
  DollarSign,
  FileCheck,
  FileText,
  PieChart,
  Target,
  TrendingUp,
  XCircle,
} from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function GrantDashboardPanel() {
  const pipelineStats = [
    {
      label: "Planning",
      count: 2,
      value: "$85,000",
      color: "text-blue-600",
      bg: "bg-blue-50",
      borderColor: "border-blue-200",
    },
    {
      label: "In Progress",
      count: 1,
      value: "$50,000",
      color: "text-amber-600",
      bg: "bg-amber-50",
      borderColor: "border-amber-200",
    },
    {
      label: "Applied",
      count: 0,
      value: "$0",
      color: "text-purple-600",
      bg: "bg-purple-50",
      borderColor: "border-purple-200",
    },
    {
      label: "Approved",
      count: 1,
      value: "$42,000",
      color: "text-emerald-600",
      bg: "bg-emerald-50",
      borderColor: "border-emerald-200",
    },
    {
      label: "Declined",
      count: 1,
      value: "$0",
      color: "text-rose-600",
      bg: "bg-rose-50",
      borderColor: "border-rose-200",
    },
    {
      label: "Total Pipeline",
      count: 5,
      value: "$177,000",
      color: "text-navy-blue",
      bg: "bg-slate-100",
      borderColor: "border-slate-200",
    },
  ];

  const keyMetrics = [
    {
      label: "Approval Rate",
      count: "50%",
      subtext: "Target: 60%",
      color: "text-olea-green",
      borderColor: "border-olea-green",
    },
    {
      label: "Total Pipeline Value",
      count: "$177K",
      subtext: "3-Year Goal: $750K",
      color: "text-navy-blue",
      borderColor: "border-navy-blue",
    },
  ];

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-navy-blue">📊 Dashboard</h2>

      {/* 6 Status Pipeline Cards */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {pipelineStats.map((stat) => (
          <Card key={stat.label} className={`border-l-4 ${stat.borderColor} ${stat.bg} shadow-soft`}>
            <CardContent className="p-3.5 space-y-1">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{stat.label}</p>
              <p className={`text-2xl font-extrabold ${stat.color}`}>{stat.count}</p>
              <p className="text-xs font-medium text-slate-700">{stat.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Key Metrics Grid */}
      <div className="space-y-3">
        <h3 className="text-lg font-bold text-navy-blue">Key Metrics</h3>
        <div className="grid gap-4 md:grid-cols-2">
          {keyMetrics.map((km) => (
            <Card key={km.label} className={`border-l-4 ${km.borderColor} shadow-soft`}>
              <CardContent className="p-5 space-y-1">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">{km.label}</p>
                <p className={`text-3xl font-extrabold ${km.color}`}>{km.count}</p>
                <p className="text-xs text-slate-400 font-medium">{km.subtext}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
