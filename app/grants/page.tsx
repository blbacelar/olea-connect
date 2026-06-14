import { Gift } from "lucide-react";
import Image from "next/image";

import { EmptyPanel } from "@/components/EmptyPanel";
import { PageHeader } from "@/components/PageHeader";
import { SectionHeading } from "@/components/SectionHeading";
import { getGrantsData } from "@/lib/data/grants";

function formatMoney(amountCents: number) {
  return new Intl.NumberFormat("en-CA", {
    style: "currency",
    currency: "CAD",
    maximumFractionDigits: 0,
  }).format(amountCents / 100);
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-CA", {
    dateStyle: "medium",
  }).format(new Date(value));
}

export default async function GrantsPage() {
  const { rounds, applications } = await getGrantsData();
  const featuredRound =
    rounds.find((round) => round.status === "open") ?? rounds[0];

  return (
    <div>
      <PageHeader
        title="Olea Gives Fund"
        description="Funded by our sponsors and awarded straight back to the nonprofit community."
      />

      {featuredRound ? (
        <section className="relative mb-7 overflow-hidden rounded-[14px] bg-[linear-gradient(120deg,#2D5C3E_0%,#4A7C59_100%)] p-7 text-white">
          <Image
            src="/olea-tree.png"
            alt=""
            width={200}
            height={200}
            className="absolute -bottom-8 -right-7 size-[200px] opacity-10"
          />
          <span className="relative inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1.5 text-xs font-semibold capitalize tracking-wide">
            <span className="size-1.5 rounded-full bg-green-200" />
            Applications {featuredRound.status}
          </span>
          <h2 className="relative mt-3.5 text-2xl font-bold tracking-[-0.01em]">
            {featuredRound.name}
          </h2>
          <p className="relative mt-1.5 text-[15px] text-[#E2EFE6]">
            {formatMoney(featuredRound.awardAmountCents)} grant ·{" "}
            {featuredRound.availableAwards} award
            {featuredRound.availableAwards === 1 ? "" : "s"} ·{" "}
            {formatDate(featuredRound.opensAt)} to{" "}
            {formatDate(featuredRound.closesAt)}
          </p>
          <p className="relative mt-3 max-w-2xl text-sm leading-6 text-[#E2EFE6]">
            {featuredRound.description}
          </p>
        </section>
      ) : (
        <div className="mb-7">
          <EmptyPanel
            title="No grant round is available"
            description="Upcoming Olea Gives rounds will appear here when applications open."
            icon={<Gift className="size-5" />}
          />
        </div>
      )}

      <SectionHeading>Your application history</SectionHeading>
      {applications.length ? (
        <div className="overflow-hidden rounded-xl border bg-white shadow-soft">
          {applications.map((application) => (
            <div
              key={application.id}
              className="grid gap-2 border-b border-slate-100 px-[22px] py-4 last:border-0 md:grid-cols-[1fr_140px_140px]"
            >
              <div>
                <p className="font-semibold">{application.roundName}</p>
                <p className="mt-1 text-xs text-slate-400">
                  Updated {formatDate(application.updatedAt)}
                </p>
              </div>
              <span className="capitalize text-slate-600">
                {application.status}
              </span>
              <span className="font-mono font-semibold">
                {formatMoney(application.requestedAmountCents)}
              </span>
            </div>
          ))}
        </div>
      ) : (
        <EmptyPanel
          title="No applications yet"
          description="Applications open quarterly. Your history will appear here."
          icon={<Gift className="size-5" />}
        />
      )}
    </div>
  );
}
