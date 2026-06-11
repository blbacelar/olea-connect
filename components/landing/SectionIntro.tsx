import { cn } from "@/lib/utils";

export function SectionIntro({
  eyebrow,
  title,
  description,
  centered = false,
}: {
  eyebrow: string;
  title: string;
  description?: string;
  centered?: boolean;
}) {
  return (
    <div className={cn("max-w-2xl", centered && "mx-auto text-center")}>
      <p className="text-xs font-bold uppercase tracking-[0.14em] text-olea-green">
        {eyebrow}
      </p>
      <h2 className="mt-3 text-balance text-3xl font-extrabold tracking-[-0.03em] text-slate-900 md:text-4xl">
        {title}
      </h2>
      {description ? (
        <p className="mt-4 text-base leading-7 text-slate-600 md:text-lg">
          {description}
        </p>
      ) : null}
    </div>
  );
}
