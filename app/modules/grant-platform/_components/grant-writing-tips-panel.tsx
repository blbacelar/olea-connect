"use client";

import {
  AlertTriangle,
  BookOpen,
  CheckCircle2,
  ChevronDown,
  Sparkles,
  Target,
} from "lucide-react";

import { RequestWriterDialog } from "@/app/modules/grant-platform/_components/request-writer-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function GrantWritingTipsPanel() {
  const stageCoaching = [
    {
      id: "planning",
      title: "📋 Planning Stage",
      items: [
        "✓ Research the funder: mission, past grants, average award size, timeline",
        "✓ Read ALL guidelines carefully - write down what they emphasize",
        "✓ Identify decision criteria - what does this funder value most?",
        "✓ Assess fit: Is this grant 90%+ aligned with our work? If not, skip it",
        "✓ Determine your angle - What makes OUR approach unique?",
      ],
    },
    {
      id: "drafting",
      title: "✍️ Drafting Stage",
      items: [
        '✓ Problem Statement: Show data, not emotion. "50% of youth lack mentorship" (with source)',
        '✓ Solution: Be specific. Not "provide mentorship" but "matched 1:1 mentoring, monthly check-ins, 12-month commitment"',
        "✓ Impact: Connect to funder priorities. Exactly what results will they see?",
        "✓ Timeline: Month-by-month for first year, show concrete milestones",
        "✓ Sustainability: How will this continue after grant funding ends?",
      ],
    },
    {
      id: "refinement",
      title: "🔍 Refinement Stage",
      items: [
        "✓ Read it aloud - awkward wording will jump out",
        "✓ Cut 20% of words - tight writing beats verbose writing",
        "✓ Check: Did we answer THEIR question or answer what we wanted to say?",
        "✓ Evidence: Every claim should have data or example backup",
        "✓ Proof read 3x and have someone else read it 1x",
      ],
    },
    {
      id: "submission",
      title: "✅ Before Submission",
      items: [
        "✓ Budget matches narrative - if you say 2 staff, budget should show 2 staff",
        "✓ All signatures/approvals: Board approval, partner letters, funder requests",
        "✓ Format check: Font size, margins, page limits - follow exactly",
        "✓ Required attachments: Org documents, 501c3, audit, demo resumes",
        "✓ Backup files: Save, email to team, upload to platform",
      ],
    },
  ];

  const topMistakes = [
    {
      num: 1,
      title: "Ignored guidelines",
      detail: "You submitted 12 pages when they wanted 5. Declined without review.",
    },
    {
      num: 2,
      title: "Generic narrative",
      detail: "Could be any nonprofit. No evidence that YOUR organization is the right fit.",
    },
    {
      num: 3,
      title: "Misaligned budget",
      detail: "You wrote about hiring 3 staff but budget shows 1 staff. Inconsistency kills trust.",
    },
    {
      num: 4,
      title: "No clear metrics",
      detail: '"Improve lives" isn\'t a metric. "Increase youth employment from 30% to 60%" is.',
    },
    {
      num: 5,
      title: "Weak sustainability",
      detail: "Grant ends, then what? Funders want to know this will live on.",
    },
  ];

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-navy-blue">📚 Grant Writing Coaching Hub</h2>

      {/* Writer Support Promo Card */}
      <div className="flex flex-col gap-4 rounded-xl border border-orange-200 bg-orange-500 p-5 text-white shadow-soft sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <p className="flex items-center gap-2 font-bold text-base">
            <Sparkles className="size-5 text-amber-200" />
            ✨ Grant Writer Support Coming Soon
          </p>
          <p className="text-xs leading-relaxed opacity-95">
            We&apos;re building a network of expert grant writers. Interested in professional writing support? Let us know and
            we&apos;ll connect you with writers who specialize in your area. Expected pricing: $500 first grant, $350 additional.
          </p>
        </div>
        <RequestWriterDialog
          trigger={
            <Button type="button" className="shrink-0 bg-white font-bold text-orange-600 hover:bg-slate-100">
              Express Interest
            </Button>
          }
        />
      </div>

      {/* Coaching by Grant Stage */}
      <Card className="shadow-soft">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Target className="size-5 text-olea-green" />
            🎯 Coaching by Grant Stage
          </CardTitle>
        </CardHeader>
        <CardContent className="divide-y divide-slate-100 p-0">
          {stageCoaching.map((stage) => (
            <details key={stage.id} open={stage.id === "planning"} className="group p-4">
              <summary className="cursor-pointer font-bold text-sm text-navy-blue flex items-center justify-between list-none">
                <span>{stage.title}</span>
                <ChevronDown className="size-4 transition-transform group-open:rotate-180 text-slate-400" />
              </summary>
              <div className="mt-3 space-y-2 text-xs text-slate-700">
                {stage.items.map((item, idx) => (
                  <p key={idx} className="leading-relaxed">
                    {item}
                  </p>
                ))}
              </div>
            </details>
          ))}
        </CardContent>
      </Card>

      {/* Top 5 Grant Writing Mistakes */}
      <Card className="border-l-4 border-orange-500 bg-slate-50/60 shadow-soft">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg text-navy-blue">
            <AlertTriangle className="size-5 text-orange-500" />
            ⚠️ Top 5 Grant Writing Mistakes
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {topMistakes.map((m) => (
            <div key={m.num} className="rounded-md border border-slate-200 bg-white p-3 text-xs space-y-0.5">
              <p className="font-bold text-orange-600">
                {m.num}. {m.title}
              </p>
              <p className="text-slate-600">{m.detail}</p>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
