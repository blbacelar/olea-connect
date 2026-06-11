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
import { getMember, getOrg, getTemplates } from "@/lib/db";

const communityPosts = [
  {
    channel: "# grants-and-funding",
    title: "Anyone applied to the Q2 Olea Gives round? Tips welcome.",
  },
  {
    channel: "# governance-questions",
    title: "How often should we refresh our conflict-of-interest policy?",
  },
  {
    channel: "# wins-and-shoutouts",
    title: "We just passed our first board self-evaluation — thank you!",
  },
];

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

export default async function DashboardPage() {
  const [organization, member, templates] = await Promise.all([
    getOrg(),
    getMember(),
    getTemplates(),
  ]);

  const stats = [
    {
      label: "Templates",
      value: "3",
      detail: "available to you",
      icon: FileText,
      tone: "bg-olea-light text-olea-green",
    },
    {
      label: "Downloads",
      value: "7",
      detail: "this month",
      icon: Download,
      tone: "bg-blue-50 text-blue-700",
    },
    {
      label: "Community",
      value: "2",
      detail: "new mentions",
      icon: Users,
      tone: "bg-orange-50 text-orange-700",
    },
    {
      label: "Grants",
      value: "Open",
      detail: "closes in 41 days",
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
          {templates.map((template) => (
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
            Q3 grant applications open July 1
          </h2>
          <p className="relative mt-2 max-w-md text-sm leading-6 text-[#E2EFE6]">
            A $500 quarterly grant awarded back to the community. Simple
            application, no complex reporting.
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
            {communityPosts.map((post) => (
              <Link
                key={post.title}
                href="/community"
                className="block border-t border-slate-100 py-3 first:border-t-0 first:pt-0"
              >
                <p className="text-xs font-semibold text-olea-green">
                  {post.channel}
                </p>
                <p className="mt-0.5 text-[13.5px] leading-5 text-slate-800">
                  {post.title}
                </p>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
