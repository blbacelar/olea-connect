import type { ReactNode } from "react";

import { Logo } from "@/components/Logo";

export function AuthCard({
  title,
  description,
  children,
  logo,
}: {
  title: string;
  description?: string;
  children: ReactNode;
  logo?: {
    ariaLabel: string;
    tagline: string;
  };
}) {
  return (
    <main className="min-h-screen bg-slate-100 px-4 py-10">
      <div className="mx-auto mb-8 w-fit">
        <Logo href="/" ariaLabel={logo?.ariaLabel} tagline={logo?.tagline} />
      </div>
      <div className="mx-auto max-w-[460px] rounded-[14px] border bg-white p-6 shadow-soft md:p-8">
        <h1 className="text-center text-[28px] font-bold tracking-[-0.02em]">
          {title}
        </h1>
        {description ? (
          <p className="mt-2 text-center text-sm leading-6 text-slate-500">
            {description}
          </p>
        ) : null}
        <div className="mt-7">{children}</div>
      </div>
    </main>
  );
}
