import Image from "next/image";

import type { GrantRound } from "@/lib/types";

import { formatDate, formatMoney } from "./grant-page-format";

export function RoundHero({ round }: { round: GrantRound }) {
  return (
    <section className="relative mb-7 overflow-hidden rounded-[14px] bg-[linear-gradient(120deg,#173F2A_0%,#446B52_100%)] p-7 text-white">
      <Image
        src="/olea-tree.png"
        alt=""
        width={200}
        height={200}
        className="absolute -bottom-8 -right-7 size-[200px] opacity-10"
      />
      <span className="relative inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1.5 text-xs font-semibold capitalize tracking-wide">
        <span className="size-1.5 rounded-full bg-green-200" />
        {round.programType.replace("_", " ")} · Applications {round.status}
      </span>
      <h2 className="relative mt-3.5 text-2xl font-bold tracking-[-0.01em]">
        {round.name}
      </h2>
      <p className="relative mt-1.5 text-[15px] text-[#E2EFE6]">
        {formatMoney(round.awardAmountCents)} grant · {round.availableAwards}{" "}
        award{round.availableAwards === 1 ? "" : "s"} ·{" "}
        {formatDate(round.opensAt)} to {formatDate(round.closesAt)}
      </p>
      <p className="relative mt-3 max-w-2xl text-sm leading-6 text-[#E2EFE6]">
        {round.description}
      </p>
      {round.publicNotes ? (
        <p className="relative mt-3 max-w-2xl rounded-lg bg-white/10 p-3 text-sm leading-6 text-[#E2EFE6]">
          {round.publicNotes}
        </p>
      ) : null}
    </section>
  );
}
