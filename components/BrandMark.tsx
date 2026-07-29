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
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={logoUrl}
          alt=""
          className="h-full w-full object-contain p-1"
        />
      ) : (
        initials
      )}
    </span>
  );
}
