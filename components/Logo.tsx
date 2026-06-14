import Image from "next/image";
import Link from "next/link";

export function Logo({
  compact = false,
  href = "/dashboard",
}: {
  compact?: boolean;
  href?: string;
}) {
  return (
    <Link href={href} className="inline-flex items-center gap-3">
      <Image
        src="/olea-tree.png"
        alt=""
        width={34}
        height={34}
        className="size-[34px] object-contain"
        priority
      />
      <span className={compact ? "hidden sm:block" : undefined}>
        <span className="block text-[15px] font-bold leading-tight text-olea-ink">
          Olea Connects
        </span>
        <span className="block text-[11px] font-medium text-slate-600">
          Governance, branded.
        </span>
      </span>
    </Link>
  );
}
