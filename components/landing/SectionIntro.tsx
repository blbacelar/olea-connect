import { cn } from "@/lib/utils";

export function SectionIntro({
  eyebrow,
  title,
  description,
  centered = false,
  inverse = false,
}: {
  eyebrow: string;
  title: string;
  description?: string;
  centered?: boolean;
  inverse?: boolean;
}) {
  return (
    <div className={cn("max-w-2xl", centered && "mx-auto text-center")}>
      <p
        className={cn(
          "text-xs font-bold uppercase tracking-[0.14em]",
          inverse ? "text-emerald-200" : "text-olea-green",
        )}
      >
        {eyebrow}
      </p>
      <h2
        className={cn(
          "mt-3 text-balance text-3xl font-extrabold tracking-[-0.03em] md:text-4xl",
          inverse ? "text-white" : "text-slate-900",
        )}
      >
        {title}
      </h2>
      {description ? (
        <p
          className={cn(
            "mt-4 text-base leading-7 md:text-lg",
            inverse ? "text-white/75" : "text-slate-600",
          )}
        >
          {description}
        </p>
      ) : null}
    </div>
  );
}
