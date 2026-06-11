import { BrandMark } from "@/components/BrandMark";
import type { BrandProfile } from "@/lib/types";

export function BrandPreview({
  brand,
  compact = false,
}: {
  brand: BrandProfile;
  compact?: boolean;
}) {
  if (compact) {
    return (
      <div className="flex items-center justify-between rounded-xl border bg-white p-4 shadow-soft">
        <div className="flex items-center gap-3">
          <BrandMark
            logoUrl={brand.logoUrl}
            initials={brand.logoInitials}
            color={brand.primaryColor}
            className="size-11 rounded-lg text-sm"
          />
          <div>
            <p className="text-sm font-semibold">{brand.organizationName}</p>
            <p className="text-xs text-slate-400">Your brand is applied</p>
          </div>
        </div>
        <div className="flex gap-2">
          {[brand.primaryColor, brand.secondaryColor].map((color) => (
            <span
              key={color}
              className="size-6 rounded-full border-2 border-white shadow"
              style={{ backgroundColor: color }}
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-3 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-400">
        <span className="size-[7px] rounded-full bg-olea-green" />
        Live preview · PDF cover page
      </div>
      <div className="flex aspect-[8.5/11] flex-col rounded-xl border bg-white px-10 py-11 shadow-[0_12px_40px_rgba(0,0,0,0.10)]">
        <div className="flex items-center gap-3.5">
          <BrandMark
            logoUrl={brand.logoUrl}
            initials={brand.logoInitials}
            color={brand.primaryColor}
            className="size-16 text-2xl"
          />
        </div>
        <div className="mt-auto">
          <p className="mb-2.5 text-[11px] font-semibold uppercase tracking-[0.1em] text-slate-400">
            Annual Survey Template
          </p>
          <h2
            className="text-[32px] font-extrabold leading-[1.1] tracking-[-0.02em]"
            style={{ color: brand.primaryColor }}
          >
            Board Self-Evaluation
          </h2>
          <div
            className="my-5 h-1 w-[88px] rounded-full"
            style={{ backgroundColor: brand.secondaryColor }}
          />
          <p className="text-[17px] font-semibold text-slate-800">
            {brand.organizationName}
          </p>
          <p className="mt-1.5 text-sm text-slate-500">
            Board Year: 2026–2027
          </p>
          <p className="text-sm text-slate-500">Survey Period: June 2026</p>
        </div>
        <div className="mt-8 flex justify-between border-t border-slate-100 pt-4 text-xs text-slate-400">
          <span>oleaconnects.ca</span>
          <span>Page 1 of 8</span>
        </div>
      </div>
      <p className="mt-3.5 text-center text-[12.5px] text-slate-400">
        This is how your templates will look when downloaded.
      </p>
    </div>
  );
}
