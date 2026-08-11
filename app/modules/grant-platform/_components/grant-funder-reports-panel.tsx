"use client";

import {
  Award,
  BarChart3,
  CheckCircle2,
  Clock,
  Download,
  PieChart,
  ShieldAlert,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export function GrantFunderReportsPanel() {
  const [activeReportModal, setActiveReportModal] = useState<"overview" | "success" | "trends" | null>(null);
  const [exportModalOpen, setExportModalOpen] = useState(false);

  const funderPerformance = [
    {
      name: "Province of BC",
      apps: 2,
      approved: 1,
      rate: "50%",
      awarded: "$50,000",
      avg: "$50,000",
      status: "Active",
      statusColor: "text-olea-green font-bold",
      rateBg: "bg-emerald-100 text-emerald-800 font-bold",
    },
    {
      name: "Arts Council of BC",
      apps: 1,
      approved: 0,
      rate: "0%",
      awarded: "$0",
      avg: "-",
      status: "Pending",
      statusColor: "text-orange-600 font-bold",
      rateBg: "bg-rose-100 text-rose-800 font-bold",
    },
    {
      name: "Community Foundation",
      apps: 1,
      approved: 1,
      rate: "100%",
      awarded: "$42,000",
      avg: "$42,000",
      status: "Active",
      statusColor: "text-olea-green font-bold",
      rateBg: "bg-emerald-100 text-emerald-800 font-bold",
    },
    {
      name: "Provincial Health Ministry",
      apps: 1,
      approved: 0,
      rate: "0%",
      awarded: "$0",
      avg: "-",
      status: "Declined",
      statusColor: "text-slate-400 font-medium",
      rateBg: "bg-rose-100 text-rose-800 font-bold",
    },
  ];

  const metrics = [
    {
      label: "Overall Win Rate",
      val: "50%",
      sub: "2 of 4 applications",
      borderColor: "border-olea-green",
      textColor: "text-olea-green",
    },
    {
      label: "Total Awarded",
      val: "$92,000",
      sub: "From approved grants",
      borderColor: "border-navy-blue",
      textColor: "text-navy-blue",
    },
    {
      label: "Best Performer",
      val: "Community Foundation",
      sub: "100% win rate",
      borderColor: "border-orange-500",
      textColor: "text-orange-600",
    },
    {
      label: "Avg Decision Time",
      val: "45 days",
      sub: "Estimated turnaround",
      borderColor: "border-indigo-500",
      textColor: "text-indigo-600",
    },
  ];

  const successRates = [
    { name: "Community Foundation", rate: 100, label: "100%", color: "bg-olea-green", textColor: "text-olea-green" },
    { name: "Province of BC", rate: 50, label: "50%", color: "bg-orange-500", textColor: "text-orange-600" },
    { name: "Arts Council of BC", rate: 0, label: "0%", color: "bg-slate-300", textColor: "text-slate-400" },
    { name: "Provincial Health Ministry", rate: 0, label: "0%", color: "bg-slate-300", textColor: "text-slate-400" },
  ];

  const recommendations = [
    {
      type: "✓ Strong Track Record",
      borderColor: "border-olea-green",
      bgColor: "bg-olea-light/40",
      text: "50% overall win rate is above industry average (20-25%). Community Foundation at 100% indicates excellent fit with their priorities.",
    },
    {
      type: "⚠️ Action Item: Province of BC",
      borderColor: "border-orange-500",
      bgColor: "bg-orange-50",
      text: "With 2 applications: 1 approved ($50K), 1 pending. Investigate what worked in the approved proposal and replicate for future applications.",
    },
    {
      type: "⚠️ Review Needed: Arts Council + Health Ministry",
      borderColor: "border-rose-500",
      bgColor: "bg-rose-50",
      text: "0% approval rate. Either these funders aren't a good fit (consider removing from pipeline), or your applications need revision. Recommended: Skip future cycles or redesign approach.",
    },
    {
      type: "💡 Strategic Recommendation",
      borderColor: "border-emerald-500",
      bgColor: "bg-emerald-50",
      text: "Focus future efforts on Community Foundation and similar funders. Investigate patterns in their funding priorities. Build on success, not on failed attempts.",
    },
  ];

  const handleExportDownload = (format: string) => {
    alert(`💾 Starting export of Funder Performance Data in ${format.toUpperCase()} format...\nFile will save to your downloads folder.`);
    setExportModalOpen(false);
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-navy-blue">📈 Funder Performance Reports</h2>

      {/* Quick Actions Buttons */}
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          className="gap-2 bg-orange-600 font-bold text-white hover:bg-orange-700"
          onClick={() => setActiveReportModal("overview")}
        >
          <BarChart3 className="size-4" />
          Funder Overview
        </Button>
        <Button
          type="button"
          className="gap-2 bg-olea-green font-bold text-white hover:bg-olea-green/90"
          onClick={() => setActiveReportModal("success")}
        >
          <CheckCircle2 className="size-4" />
          Success Rates
        </Button>
        <Button
          type="button"
          className="gap-2 bg-navy-blue font-bold text-white hover:bg-navy-blue/90"
          onClick={() => setActiveReportModal("trends")}
        >
          <TrendingUp className="size-4" />
          Funding Trends
        </Button>
        <Button
          type="button"
          variant="outline"
          className="gap-2 bg-slate-600 font-bold text-white hover:bg-slate-700"
          onClick={() => setExportModalOpen(true)}
        >
          <Download className="size-4" />
          Export Data
        </Button>
      </div>

      {/* Funder Performance Table */}
      <Card className="shadow-soft">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <PieChart className="size-5 text-olea-green" />
            🤝 Funder Performance Overview
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[650px] border-collapse text-xs">
              <thead>
                <tr className="border-b-2 border-olea-green bg-slate-100/70 text-left font-bold text-navy-blue">
                  <th className="p-3">Funder</th>
                  <th className="p-3 text-center">Applications</th>
                  <th className="p-3 text-center">Approved</th>
                  <th className="p-3 text-center">Success Rate</th>
                  <th className="p-3 text-center">Total Awarded</th>
                  <th className="p-3 text-center">Avg Award</th>
                  <th className="p-3 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {funderPerformance.map((row) => (
                  <tr key={row.name} className="hover:bg-slate-50/60">
                    <td className="p-3 font-semibold text-slate-900">{row.name}</td>
                    <td className="p-3 text-center text-slate-700">{row.apps}</td>
                    <td className="p-3 text-center text-slate-700">{row.approved}</td>
                    <td className="p-3 text-center">
                      <span className={`rounded px-2 py-0.5 text-xs ${row.rateBg}`}>{row.rate}</span>
                    </td>
                    <td className="p-3 text-center font-medium text-slate-800">{row.awarded}</td>
                    <td className="p-3 text-center text-slate-600">{row.avg}</td>
                    <td className={`p-3 text-center ${row.statusColor}`}>{row.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Key Metrics Grid */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {metrics.map((m) => (
          <Card key={m.label} className={`border-l-4 ${m.borderColor} shadow-soft`}>
            <CardContent className="p-4 space-y-1">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{m.label}</p>
              <p className={`text-2xl font-extrabold ${m.textColor}`}>{m.val}</p>
              <p className="text-xs text-slate-400">{m.sub}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Success Rate Breakdown */}
      <Card className="shadow-soft">
        <CardHeader>
          <CardTitle className="text-lg">Success Rate by Funder</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {successRates.map((s) => (
            <div key={s.name} className="space-y-1.5">
              <div className="flex justify-between text-xs font-semibold">
                <span className="text-slate-800">{s.name}</span>
                <span className={s.textColor}>{s.label}</span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                <div className={`h-full ${s.color}`} style={{ width: `${s.rate}%` }} />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Funding Trends & Insights */}
      <Card className="shadow-soft">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <TrendingUp className="size-5 text-olea-green" />
            📈 Funding Insights & Recommendations
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {recommendations.map((rec, i) => (
            <div key={i} className={`rounded-lg border-l-4 ${rec.borderColor} ${rec.bgColor} p-3 text-xs space-y-1`}>
              <p className="font-bold text-slate-900">{rec.type}</p>
              <p className="text-slate-600 leading-relaxed">{rec.text}</p>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Generated Report Dialog Modal */}
      <Dialog open={activeReportModal !== null} onOpenChange={() => setActiveReportModal(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BarChart3 className="size-5 text-olea-green" />
              {activeReportModal === "overview" && "📊 Funder Overview Summary"}
              {activeReportModal === "success" && "✅ Success Rate Analysis"}
              {activeReportModal === "trends" && "📈 Funding Trends & Recommendations"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3 text-xs leading-relaxed text-slate-700 max-h-[60vh] overflow-y-auto pr-1">
            {activeReportModal === "overview" && (
              <div className="space-y-2">
                <p className="font-bold text-slate-900">Funder Performance Summary (2026):</p>
                <ul className="list-disc pl-4 space-y-1">
                  <li><strong>Province of BC:</strong> 2 Apps | 1 Approved | 50% Win Rate | $50,000 Awarded</li>
                  <li><strong>Arts Council of BC:</strong> 1 App | 0 Approved (Pending) | $0 Awarded</li>
                  <li><strong>Community Foundation:</strong> 1 App | 1 Approved | 100% Win Rate | $42,000 Awarded</li>
                  <li><strong>Provincial Health Ministry:</strong> 1 App | 0 Approved (Declined) | $0 Awarded</li>
                </ul>
                <div className="rounded border border-emerald-200 bg-emerald-50 p-2 text-emerald-800 font-semibold mt-2">
                  ✓ Overall Win Rate: 50% (Industry average: 20-25%)
                  <br />✓ Total Awarded: $92,000
                </div>
              </div>
            )}

            {activeReportModal === "success" && (
              <div className="space-y-2">
                <p className="font-bold text-slate-900">Rankings & Recommendations:</p>
                <div className="space-y-1.5">
                  <p>🥇 <strong>Community Foundation: 100%</strong> (1/1 approved - $42,000) - Focus here, highest alignment.</p>
                  <p>🥈 <strong>Province of BC: 50%</strong> (1/2 approved - $50,000) - Investigate winning narrative elements.</p>
                  <p>❌ <strong>Arts Council: 0%</strong> (Pending decision) - Review feedback once decision is announced.</p>
                  <p>❌ <strong>Health Ministry: 0%</strong> (Declined) - Exceeded 75% Govt limit. Diversify funding sources.</p>
                </div>
              </div>
            )}

            {activeReportModal === "trends" && (
              <div className="space-y-2">
                <p className="font-bold text-slate-900">Trends Identified:</p>
                <ul className="list-disc pl-4 space-y-1">
                  <li>Community Foundation yields highest return on effort.</li>
                  <li>Average award is 48% of total requested value.</li>
                  <li>Health & Arts sector grants face higher threshold restrictions.</li>
                </ul>
                <p className="font-semibold text-slate-900 pt-2">Next Steps:</p>
                <p>Double down on Community Foundation style funders and target $50K–$100K grants.</p>
              </div>
            )}
          </div>

          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setActiveReportModal(null)}>
              Close
            </Button>
            <Button
              className="bg-olea-green text-white hover:bg-olea-green/90"
              onClick={() => {
                setActiveReportModal(null);
                setExportModalOpen(true);
              }}
            >
              Export Report Data
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Export Options Modal */}
      <Dialog open={exportModalOpen} onOpenChange={setExportModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Download className="size-5 text-olea-green" />
              💾 Export Funder Performance Data
            </DialogTitle>
            <DialogDescription>
              Select export format for board reporting and executive summary.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-2 py-2">
            {[
              { format: "csv", title: "CSV Format (.csv)", desc: "Open in Excel or Google Sheets" },
              { format: "excel", title: "Excel Spreadsheet (.xlsx)", desc: "Formatted workbook with charts & tabs" },
              { format: "pdf", title: "PDF Report (.pdf)", desc: "Board-ready printable document" },
              { format: "json", title: "JSON Raw Data (.json)", desc: "Raw data for analytical tools" },
            ].map((exp) => (
              <Button
                key={exp.format}
                variant="outline"
                className="justify-start text-left h-auto py-3 px-4"
                onClick={() => handleExportDownload(exp.format)}
              >
                <div>
                  <p className="font-bold text-slate-900 text-xs">{exp.title}</p>
                  <p className="text-[11px] text-slate-500 font-normal">{exp.desc}</p>
                </div>
              </Button>
            ))}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setExportModalOpen(false)}>
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
