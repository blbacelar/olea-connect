import { ChevronDown } from "lucide-react";

import { SectionIntro } from "@/components/landing/SectionIntro";

const faqs = [
  {
    question: "Who is Olea Connects for?",
    answer:
      "Registered nonprofits, societies, charities, and community organizations at any size or stage are welcome. Resources are written primarily for a Canadian context, while international members can also join.",
  },
  {
    question: "Does every plan include the community?",
    answer:
      "Yes. Every member has full access to the private peer community, weekly grant alerts, virtual networking, sponsor-led learning, and community channels from day one. Plans differ by resource-library depth and included learning access.",
  },
  {
    question: "How does automatic template branding work?",
    answer:
      "During setup, you upload your logo, choose your colours, and confirm your organization name. Eligible templates then render with that identity automatically, ready to download, print, and use.",
  },
  {
    question: "Can membership be included in a grant budget?",
    answer:
      "Yes. Olea Connects membership can fit under organizational capacity building, a category supported by many Canadian foundations and government funders. Olea can provide a letter confirming membership and included value.",
  },
  {
    question: "Can we upgrade, cancel, or pause?",
    answer:
      "You can upgrade without losing your profile, community access, or template history. Memberships can be cancelled, and organizations facing a genuine funding gap can request a pause of up to 60 days.",
  },
  {
    question: "What is the Olea Gives Fund?",
    answer:
      "It is a sponsor-funded grant program for current members. Quarterly $500 grants support operational capacity, governance, program rollout, or communications, with a simple one-page application.",
  },
  {
    question: "Is content available in French?",
    answer:
      "Core governance templates and ebooks are available in English and French, and the French-language library will continue to grow.",
  },
  {
    question: "What makes Harvest different?",
    answer:
      "Harvest combines the complete Canopy library with CEO-delivered fractional administration: five monthly support hours, two in-kind hours, board packages, committee minutes, and a monthly strategy call. It is limited to eight clients.",
  },
];

export function LandingFaq() {
  return (
    <section id="faq" className="px-4 py-20 md:py-28">
      <div className="mx-auto max-w-3xl">
        <SectionIntro
          eyebrow="Frequently asked questions"
          title="A few things you may be wondering."
          description="Straight answers about membership, access, branding, and support."
          centered
        />
        <div className="mt-10 divide-y rounded-2xl border bg-white px-5 md:px-7">
          {faqs.map((faq) => (
            <details key={faq.question} className="group py-5">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-base font-bold">
                {faq.question}
                <ChevronDown className="size-5 shrink-0 text-slate-400 transition group-open:rotate-180" />
              </summary>
              <p className="max-w-2xl pt-3 text-sm leading-7 text-slate-500">
                {faq.answer}
              </p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
