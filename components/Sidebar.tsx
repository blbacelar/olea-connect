"use client";

import { Settings } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { Logo } from "@/components/Logo";
import { navigationGroups } from "@/components/navigation";
import { useSession } from "@/hooks/use-session";
import { cn } from "@/lib/utils";

export function Sidebar() {
  const pathname = usePathname();
  const session = useSession();
  const organization = session?.organization;

  return (
    <aside className="fixed inset-y-0 left-0 z-40 hidden w-60 flex-col border-r bg-white lg:flex">
      <div className="flex h-[68px] items-center border-b border-slate-100 px-4">
        <Logo />
      </div>

      <div className="px-4 pb-2 pt-4">
        <p className="truncate text-[14.5px] font-semibold text-slate-800">
          {organization?.name ?? "Olea Connects"}
        </p>
        <span className="mt-1.5 inline-flex items-center gap-1 rounded-full bg-green-100 px-2.5 py-1 text-xs font-semibold capitalize text-green-800">
          <span aria-hidden="true">🌿</span> {organization?.tier ?? "member"}
        </span>
      </div>

      <nav
        aria-label="Primary navigation"
        className="flex-1 overflow-y-auto px-3 pb-3 pt-1"
      >
        {navigationGroups.map((group, groupIndex) => (
          <div
            key={groupIndex}
            className={cn(
              "space-y-0.5 py-2",
              groupIndex > 0 && "border-t border-slate-100",
            )}
          >
            {group.map((item) => {
              const Icon = item.icon;
              const active =
                item.href === "/dashboard"
                  ? pathname === item.href
                  : pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "relative flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100",
                    active &&
                      "bg-olea-light font-semibold text-olea-dark shadow-[inset_3px_0_0_#4A7C59] hover:bg-olea-light",
                  )}
                >
                  <Icon className="size-5 shrink-0" strokeWidth={1.8} />
                  <span className="flex-1">{item.label}</span>
                  {item.dot ? (
                    <span className="size-[7px] rounded-full bg-olea-orange" />
                  ) : null}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      <div className="border-t p-3">
        <Link
          href="/settings/brand"
          className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-slate-500 hover:bg-slate-100"
        >
          <Settings className="size-5" />
          Workspace settings
        </Link>
      </div>
    </aside>
  );
}
