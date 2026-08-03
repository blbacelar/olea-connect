import {
  CalendarDays,
  FileText,
  Gift,
  MessageCircleMore,
  Palette,
  SearchCheck,
} from "lucide-react";

import { SectionIntro } from "@/components/landing/SectionIntro";
import { Card } from "@/components/ui/card";

const features = [
  {
    icon: Palette,
    title: "Brand once. Use everywhere.",
    text: "Upload your logo and colours once. Every eligible template renders with your organization’s identity automatically.",
    outcome: "No design skills or reformatting required.",
  },
  {
    icon: FileText,
    title: "Start with board-ready tools.",
    text: "Use practical governance templates, ebooks, and how-to resources written primarily for the Canadian nonprofit context.",
    outcome: "Move confidently from blank page to usable document.",
  },
  {
    icon: MessageCircleMore,
    title: "Find people who understand.",
    text: "Ask questions and share experience in a private, moderated community for nonprofit leaders at every stage.",
    outcome: "Community access is included in every tier.",
  },
  {
    icon: SearchCheck,
    title: "Spot funding opportunities.",
    text: "Receive weekly grant alerts and connect with funders through focused sessions and community channels.",
    outcome: "Spend less time hunting across the web.",
  },
  {
    icon: CalendarDays,
    title: "Learn directly from experts.",
    text: "Join live and recorded sessions led by professionals in governance, legal, finance, HR, technology, and funding.",
    outcome: "Turn expert knowledge into practical next steps.",
  },
  {
    icon: Gift,
    title: "Access member-only grants.",
    text: "Apply through a simple, one-page process for quarterly $500 capacity grants funded by Olea sponsors.",
    outcome: "Sponsor investment flows back to nonprofits.",
  },
];

export function LandingFeatures() {
  return (
    <section id="features" className="bg-slate-50 px-4 py-20 md:py-28">
      <div className="mx-auto max-w-7xl">
        <SectionIntro
          eyebrow="What you get"
          title="Useful on Monday morning, not someday."
          description="Every part of Olea Connects™ is designed to reduce administrative friction and help your organization build capacity at its own pace."
          centered
        />
        <div className="mt-12 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {features.map((feature) => {
            const Icon = feature.icon;
            return (
              <Card
                key={feature.title}
                className="group p-6 shadow-none transition hover:-translate-y-1 hover:border-olea-green/30 hover:shadow-lg"
              >
                <span className="grid size-12 place-items-center rounded-xl bg-olea-light text-olea-dark transition group-hover:bg-olea-green group-hover:text-white">
                  <Icon className="size-5" />
                </span>
                <h3 className="mt-5 text-xl font-bold">{feature.title}</h3>
                <p className="mt-3 text-sm leading-6 text-slate-500">
                  {feature.text}
                </p>
                <p className="mt-5 border-t pt-4 text-sm font-semibold text-olea-dark">
                  {feature.outcome}
                </p>
              </Card>
            );
          })}
        </div>
      </div>
    </section>
  );
}
