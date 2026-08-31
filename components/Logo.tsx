import Image from "next/image";
import Link from "next/link";

import { brandName } from "@/lib/brand";

export function Logo({
  compact = false,
  href = "/dashboard",
  ariaLabel = "Olea Connects governance platform",
  tagline = "Governance, branded.",
}: {
  compact?: boolean;
  href?: string;
  ariaLabel?: string;
  tagline?: string;
}) {
  return (
    <Link
      href={href}
      aria-label={ariaLabel}
      className="inline-flex shrink-0 items-center gap-3"
    >
      <Image
        src="/olea-tree.png"
        alt=""
        width={34}
        height={34}
        className="size-[34px] shrink-0 object-contain"
        priority
      />
      <span className={compact ? "sr-only" : undefined}>
        <span className="block text-[15px] font-bold leading-tight text-olea-green">
          {brandName}
        </span>
        <span className="block text-[11px] font-medium text-slate-600">
          {tagline}
        </span>
      </span>
    </Link>
  );
}
