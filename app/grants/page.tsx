import { Gift } from "lucide-react";
import Image from "next/image";

import { DemoActionButton } from "@/components/DemoActionButton";
import { EmptyPanel } from "@/components/EmptyPanel";
import { PageHeader } from "@/components/PageHeader";
import { SectionHeading } from "@/components/SectionHeading";

const grantFocus = [
  "Operational capacity",
  "Governance strengthening",
  "Program rollout",
  "Communications & outreach",
];

export default function GrantsPage() {
  return (
    <div>
      <PageHeader
        title="Olea Gives Fund"
        description="Funded by our sponsors and awarded straight back to the nonprofit community."
      />

      <section className="relative mb-7 overflow-hidden rounded-[14px] bg-[linear-gradient(120deg,#2D5C3E_0%,#4A7C59_100%)] p-7 text-white">
        <Image
          src="/olea-tree.png"
          alt=""
          width={200}
          height={200}
          className="absolute -bottom-8 -right-7 size-[200px] opacity-10"
        />
        <span className="relative inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1.5 text-xs font-semibold tracking-wide">
          <span className="size-1.5 rounded-full bg-green-200" />
          Applications open
        </span>
        <h2 className="relative mt-3.5 text-2xl font-bold tracking-[-0.01em]">
          Q3 2026 — July 1 to July 21
        </h2>
        <p className="relative mt-1.5 text-[15px] text-[#E2EFE6]">
          $500 quarterly grant · Multiple recipients · Simple application, no
          complex reporting.
        </p>
        <DemoActionButton
          message="Your grant application draft has been started."
          className="relative mt-5 bg-white px-6 text-[15px] font-bold text-olea-dark hover:bg-green-50"
        >
          Apply now →
        </DemoActionButton>
      </section>

      <div className="mb-7 grid gap-6 md:grid-cols-2">
        <section>
          <SectionHeading>Grant amounts</SectionHeading>
          <div className="rounded-xl border bg-white px-[22px] py-1.5 shadow-soft">
            {[
              ["Quarterly grant", "$500"],
              ["Annual summit grant", "$2,500"],
            ].map(([label, amount], index) => (
              <div
                key={label}
                className={`flex items-center justify-between py-4 ${
                  index === 0 ? "border-b border-slate-100" : ""
                }`}
              >
                <span className="text-[15px] font-semibold">{label}</span>
                <span className="font-mono text-[17px] font-bold text-olea-dark">
                  {amount}
                </span>
              </div>
            ))}
          </div>
        </section>

        <section>
          <SectionHeading>What the grants fund</SectionHeading>
          <div className="space-y-3 rounded-xl border bg-white px-[22px] py-[18px] shadow-soft">
            {grantFocus.map((item) => (
              <div key={item} className="flex items-start gap-2.5">
                <span className="mt-2 size-1.5 shrink-0 rounded-full bg-olea-green" />
                <span className="text-sm text-slate-700">{item}</span>
              </div>
            ))}
          </div>
        </section>
      </div>

      <SectionHeading>Your application history</SectionHeading>
      <EmptyPanel
        title="No applications yet"
        description="Applications open quarterly. Your history will appear here."
        icon={<Gift className="size-5" />}
      />
    </div>
  );
}
