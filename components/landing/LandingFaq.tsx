import { ChevronDown } from "lucide-react";

import { SectionIntro } from "@/components/landing/SectionIntro";

const faqs = [
  {
    question: "Who is Olea Connects™ for?",
    answer:
      "Registered nonprofits, societies, charities, and community organizations at any size or stage are welcome. Resources are written primarily for a Canadian context, while international members can also join.",
  },
  {
    question: "How does billing work?",
    answer:
      "Memberships are billed annually or quarterly, paid upfront in Canadian dollars, and renew on your signup anniversary. Prices are shown before tax; GST/PST is calculated during checkout by province.",
  },
  {
    question: "Is there a free trial?",
    answer:
      "No. Olea Connects™ does not offer a free trial. The founding-member offer gives the first 50 organizations 15% off Year 1 instead.",
  },
  {
    question: "What is the founding-member offer?",
    answer:
      "The first 50 paid organizations receive 15% off their first year. After Year 1, the membership renews at the regular tier price.",
  },
  {
    question: "How many seats are included?",
    answer:
      "Seedling includes 5 seats, Roots includes 10, Canopy includes 15, and Harvest includes 20. Additional seats are $15 CAD one-time per seat on any tier.",
  },
  {
    question: "Can we upgrade or downgrade?",
    answer:
      "Upgrades are available anytime and charge the price difference immediately while keeping the renewal date unchanged. Downgrades happen at renewal and require 30 days' notice.",
  },
  {
    question: "Can we cancel?",
    answer:
      "Yes. Cancellation requires 30 days' notice before renewal. Membership fees are non-refundable, and cancelled organizations have a 30-day grace period to download their data.",
  },
  {
    question: "How do referrals work?",
    answer:
      "Every organization receives a referral code. Referral credit is earned only after the referred organization completes its first successful payment; self-referrals are blocked.",
  },
  {
    question: "Are coaching and admin support included?",
    answer:
      "Coaching, admin support, and board retreat facilitation are available as add-ons. Canopy and Harvest members receive 10% off coaching and admin packages.",
  },
  {
    question: "How does Olea Gives support access?",
    answer:
      "Olea Gives provides quarterly grant opportunities funded by Olea's generosity engine. There is no sliding-scale membership pricing; organizations with limited budgets can apply for an unrestricted Olea Gives gift.",
  },
  {
    question: "What happens to our data if we cancel?",
    answer:
      "Your organization owns its data. After cancellation, you have a 30-day grace period to download or export it before it is removed from live systems.",
  },
];

export function LandingFaq() {
  return (
    <section id="faq" className="px-4 py-20 md:py-28">
      <div className="mx-auto max-w-3xl">
        <SectionIntro
          eyebrow="Frequently asked questions"
          title="A few things you may be wondering."
          description="Straight answers about pricing, billing, seats, referrals, and support."
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
