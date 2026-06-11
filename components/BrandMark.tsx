import Image from "next/image";

import { cn } from "@/lib/utils";

export function BrandMark({
  logoUrl,
  initials,
  color,
  className,
}: {
  logoUrl?: string;
  initials: string;
  color: string;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "relative grid shrink-0 place-items-center overflow-hidden rounded-xl font-bold text-white",
        className,
      )}
      style={{ backgroundColor: color }}
    >
      {logoUrl ? (
        <Image
          src={logoUrl}
          alt=""
          fill
          unoptimized
          sizes="64px"
          className="object-contain p-1"
        />
      ) : (
        initials
      )}
    </span>
  );
}
