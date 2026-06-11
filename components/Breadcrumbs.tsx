"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const labels: Record<string, string> = {
  dashboard: "Dashboard",
  templates: "Templates",
  "board-self-evaluation": "Board Self-Evaluation",
  settings: "Settings",
  brand: "Brand Profile",
  community: "Community",
  grants: "Olea Gives Fund",
  webinars: "Webinars",
  team: "Team",
  subscription: "Subscription",
  help: "Help",
  "whats-new": "What's new",
};

export function Breadcrumbs() {
  const pathname = usePathname();
  const segments = pathname.split("/").filter(Boolean);
  const crumbs =
    segments.length === 0
      ? [{ label: "Dashboard", href: "/dashboard" }]
      : segments.map((segment, index) => ({
          label:
            labels[segment] ??
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
              <span className="font-semibold text-slate-800">{crumb.label}</span>
            ) : (
              <Link href={crumb.href} className="text-slate-500 hover:text-olea-green">
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
