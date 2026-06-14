import {
  ArrowRight,
  Download,
  FileText,
  Gift,
  Users,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";

import { PageHeader } from "@/components/PageHeader";
import { BrandIncompleteBanner } from "@/components/BrandIncompleteBanner";
import { SectionHeading } from "@/components/SectionHeading";
import { StatCard } from "@/components/StatCard";
import { TemplateCard } from "@/components/TemplateCard";
import { Button } from "@/components/ui/button";
import { getDashboardSummary } from "@/lib/data/dashboard";
import { requireMemberContext } from "@/lib/data/member-context";
import { getTemplates } from "@/lib/data/templates";

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

export default async function DashboardPage() {
  const [{ organization, member }, templates, summary] = await Promise.all([
    requireMemberContext(),
    getTemplates(),
    getDashboardSummary(),
  ]);

  const stats = [
    {
      label: "Templates",
      value: String(templates.filter((template) => template.available).length),
      detail: "available to you",
      icon: FileText,
      tone: "bg-olea-light text-olea-green",
    },
    {
      label: "Downloads",
      value: String(summary.completedTemplates),
      detail: "completed",
      icon: Download,
      tone: "bg-blue-50 text-blue-700",
    },
    {
      label: "Community",
      value: String(summary.unreadNotifications),
      detail: "new mentions",
      icon: Users,
      tone: "bg-orange-50 text-orange-700",
    },
    {
      label: "Grants",
      value: summary.grantRound?.status === "open" ? "Open" : "Upcoming",
      detail: summary.grantRound?.name ?? "No active round",
      icon: Gift,
      tone: "bg-amber-50 text-amber-600",
    },
  ];

  return (
    <div>
      <BrandIncompleteBanner />
      <PageHeader
        title={`${getGreeting()}, ${member.firstName}.`}
        description={`${organization.name} · Here's what's happening with your governance toolkit.`}
        action={
          <Button asChild>
            <Link href="/templates">
              Browse templates
              <ArrowRight className="size-4" />
            </Link>
          </Button>
        }
      />

      <section className="mb-9 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => (
          <StatCard key={stat.label} {...stat} />
        ))}
      </section>

      <section className="mb-9">
        <SectionHeading
          action={
            <Link
              href="/templates"
              className="text-[13px] font-semibold text-olea-green hover:text-olea-dark"
            >
              View all →
            </Link>
          }
        >
          Your templates
        </SectionHeading>
        <div className="grid gap-4 md:grid-cols-2">
          {templates.slice(0, 4).map((template) => (
            <TemplateCard
              key={template.id}
              template={template}
              variant="dashboard"
            />
          ))}
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-[1.3fr_1fr]">
        <div className="relative overflow-hidden rounded-[14px] bg-[linear-gradient(120deg,#2D5C3E_0%,#4A7C59_100%)] p-6 text-white shadow-soft md:p-[26px]">
          <Image
            src="/olea-tree.png"
            alt=""
            width={190}
            height={190}
            className="absolute -bottom-10 -right-8 size-[190px] opacity-10"
          />
          <p className="relative text-xs font-semibold uppercase tracking-[0.08em] text-[#CFE6D6]">
            Olea Gives Fund
          </p>
          <h2 className="relative mt-2.5 text-[22px] font-bold tracking-[-0.01em]">
            {summary.grantRound?.name ?? "Olea Gives grants"}
          </h2>
          <p className="relative mt-2 max-w-md text-sm leading-6 text-[#E2EFE6]">
            {summary.grantRound
              ? `Applications ${summary.grantRound.status}. Review the current round and your application history.`
              : "New grant rounds will appear here when applications become available."}
          </p>
          <Button
            asChild
            className="relative mt-[18px] bg-white text-olea-dark hover:bg-green-50"
          >
            <Link href="/grants">Apply now →</Link>
          </Button>
        </div>

        <div className="rounded-[14px] border bg-white p-[22px] shadow-soft">
          <SectionHeading>Recent in community</SectionHeading>
          <div>
            {summary.notifications.map((notification) => (
              <Link
                key={notification.id}
                href={notification.action_url ?? "/dashboard"}
                className="block border-t border-slate-100 py-3 first:border-t-0 first:pt-0"
              >
                <p className="text-xs font-semibold text-olea-green">
                  Notification
                </p>
                <p className="mt-0.5 text-[13.5px] leading-5 text-slate-800">
                  {notification.title}
                </p>
              </Link>
            ))}
            {summary.notifications.length === 0 ? (
              <p className="py-8 text-center text-sm text-slate-500">
                You have no unread notifications.
              </p>
            ) : null}
          </div>
        </div>
      </section>
    </div>
  );
}
