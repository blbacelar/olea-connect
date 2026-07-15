import { Download } from "lucide-react";

import { DemoActionButton } from "@/components/DemoActionButton";
import { PageHeader } from "@/components/PageHeader";
import { SectionHeading } from "@/components/SectionHeading";
import { Button } from "@/components/ui/button";

const billingHistory = [
  ["June 10, 2026", "Roots Quarterly", "$800.00"],
  ["March 10, 2026", "Roots Quarterly", "$800.00"],
  ["December 10, 2025", "Roots Quarterly", "$800.00"],
];

export default function SubscriptionPage() {
  return (
    <div>
      <PageHeader
        title="Subscription"
        description="Manage your plan, seats, and billing."
      />

      <section className="mb-6 rounded-[14px] border bg-white p-[26px] shadow-soft">
        <div className="grid gap-6 md:grid-cols-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.05em] text-slate-400">
              Current plan
            </p>
            <p className="mt-2 flex items-center gap-2 text-lg font-bold">
              🌿 Roots
            </p>
            <p className="mt-1 text-[13.5px] text-slate-500">
              $800.00 / quarter
            </p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.05em] text-slate-400">
              Next billing date
            </p>
            <p className="mt-2 text-lg font-semibold">July 10, 2026</p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.05em] text-slate-400">
              Payment method
            </p>
            <p className="mt-2 text-base font-semibold">Visa ending 4242</p>
            <DemoActionButton
              message="Payment method editor opened."
              variant="link"
              className="h-auto p-0 text-[13px] text-olea-green"
            >
              Update
            </DemoActionButton>
          </div>
        </div>
      </section>

      <section className="mb-6 flex flex-wrap items-center justify-between gap-5 rounded-[14px] border border-[#CFE6D6] bg-[linear-gradient(120deg,#E8F0EA_0%,#FFFFFF_100%)] p-6">
        <div className="max-w-[520px]">
          <h2 className="text-[17px] font-bold text-olea-dark">
            🌳 Upgrade to Canopy
          </h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Unlock board evaluation, ED/CEO 360 review, strategic planning, and
            15 included seats for $1,500/quarter or $6,000/year.
          </p>
        </div>
        <DemoActionButton message="Your Canopy upgrade checkout is ready.">
          Upgrade now →
        </DemoActionButton>
      </section>

      <SectionHeading>Billing history</SectionHeading>
      <div className="mb-7 overflow-hidden rounded-xl border bg-white shadow-soft">
        <div className="hidden grid-cols-[1fr_1fr_120px_100px] bg-slate-50 px-[22px] py-3 text-[11px] font-semibold uppercase tracking-wide text-slate-400 md:grid">
          <span>Date</span>
          <span>Plan</span>
          <span>Amount</span>
          <span className="text-right">Invoice</span>
        </div>
        {billingHistory.map(([date, plan, amount]) => (
          <div
            key={date}
            className="grid gap-2 border-t border-slate-100 px-[22px] py-[15px] text-sm first:border-t-0 md:grid-cols-[1fr_1fr_120px_100px] md:items-center"
          >
            <span>{date}</span>
            <span className="text-slate-500">{plan}</span>
            <span className="font-mono">{amount}</span>
            <DemoActionButton
              message={`Invoice for ${date} is ready to download.`}
              variant="link"
              className="h-auto justify-start p-0 text-olea-green md:justify-end"
            >
              <Download className="size-3.5" />
              Invoice
            </DemoActionButton>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-3">
        <DemoActionButton
          message="Membership pause options opened."
          variant="outline"
          className="text-slate-500"
        >
          Pause membership
        </DemoActionButton>
        <Button
          variant="outline"
          className="border-red-200 text-red-600 hover:bg-red-50"
        >
          Cancel membership
        </Button>
      </div>
    </div>
  );
}
