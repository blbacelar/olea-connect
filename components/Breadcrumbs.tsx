"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { useLocaleContext } from "@/components/i18n/LocaleProvider";
import { getAppShellCopy } from "@/lib/i18n/app-shell-copy";

export function Breadcrumbs() {
  const pathname = usePathname();
  const { locale } = useLocaleContext();
  const { breadcrumbs } = getAppShellCopy(locale);
  const segments = pathname.split("/").filter(Boolean);
  const crumbs =
    segments.length === 0
      ? [{ label: breadcrumbs.dashboard, href: "/dashboard" }]
      : segments.map((segment, index) => ({
          label:
            breadcrumbs[segment] ??
            segment
              .split("-")
              .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
              .join(" "),
          href: `/${segments.slice(0, index + 1).join("/")}`,
        }));

  return (
    <div className="flex h-[42px] shrink-0 items-center border-b bg-white px-4 text-[13px] md:px-6">
      {crumbs.map((crumb, index) => {
        const current = index === crumbs.length - 1;
        return (
          <span key={crumb.href} className="flex items-center">
            {current ? (
              <span className="font-semibold text-slate-800">
                {crumb.label}
              </span>
            ) : (
              <Link
                href={crumb.href}
                className="text-slate-500 hover:text-olea-green"
              >
                {crumb.label}
              </Link>
            )}
            {!current ? <span className="mx-2.5 text-slate-300">/</span> : null}
          </span>
        );
      })}
    </div>
  );
}
