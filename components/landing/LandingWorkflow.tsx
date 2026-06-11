import { Download, Palette, UserPlus } from "lucide-react";

import { SectionIntro } from "@/components/landing/SectionIntro";

const steps = [
  {
    number: "01",
    icon: UserPlus,
    title: "Choose your membership",
    text: "Pick the resource depth that fits your organization. Sign-up takes about five minutes and access begins immediately.",
  },
  {
    number: "02",
    icon: Palette,
    title: "Set up your brand",
    text: "Add your organization name, logo, and colours once. Seedling members then choose their three priority templates.",
  },
  {
    number: "03",
    icon: Download,
    title: "Use your home base",
    text: "Open resources with your brand already applied, download board-ready PDFs, join the community, and explore learning and grants.",
  },
];

export function LandingWorkflow() {
  return (
    <section id="how-it-works" className="px-4 py-20 md:py-28">
      <div className="mx-auto max-w-7xl">
        <SectionIntro
          eyebrow="How it works"
          title="From sign-up to board-ready in three steps."
          description="Olea Connects is designed to feel simple from the first login, even when your organization is busy and your team is small."
          centered
        />
        <div className="relative mt-14 grid gap-8 md:grid-cols-3">
          <div className="absolute left-[16%] right-[16%] top-7 hidden border-t-2 border-dashed border-olea-green/20 md:block" />
          {steps.map((step) => {
            const Icon = step.icon;
            return (
              <div key={step.number} className="relative text-center">
                <span className="relative z-10 mx-auto grid size-14 place-items-center rounded-full border-4 border-white bg-olea-green text-sm font-bold text-white shadow-lg">
                  {step.number}
                </span>
                <Icon className="mx-auto mt-7 size-6 text-olea-orange" />
                <h3 className="mt-4 text-xl font-bold">{step.title}</h3>
                <p className="mx-auto mt-3 max-w-sm text-sm leading-6 text-slate-500">
                  {step.text}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
