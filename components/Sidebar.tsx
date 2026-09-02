"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Leaf, PanelLeftClose, PanelLeftOpen } from "lucide-react";

import { useLocaleContext } from "@/components/i18n/LocaleProvider";
import { Logo } from "@/components/Logo";
import { getNavigationGroups } from "@/components/navigation";
import { Button } from "@/components/ui/button";
import { useSession } from "@/hooks/use-session";
import { getAppShellCopy } from "@/lib/i18n/app-shell-copy";
import { getPublicSiteCopy } from "@/lib/i18n/public-site-copy";
import { cn } from "@/lib/utils";

type SidebarProps = {
  collapsed: boolean;
  onCollapsedChange: (collapsed: boolean) => void;
};

function getSidebarTooltipTestId(label: string) {
  return `sidebar-tooltip-${label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
}

export function Sidebar({ collapsed, onCollapsedChange }: SidebarProps) {
  const pathname = usePathname();
  const session = useSession();
  const { locale } = useLocaleContext();
  const copy = getAppShellCopy(locale);
  const publicCopy = getPublicSiteCopy(locale);
  const organization = session?.organization;
  const navigationGroups = getNavigationGroups(
    session?.platformRoles,
    session?.member.membershipRole,
    locale,
  );
  const ToggleIcon = collapsed ? PanelLeftOpen : PanelLeftClose;
  const tier = organization?.tier ?? copy.header.member.toLowerCase();

  function isActiveRoute(href: string) {
    if (href === "/dashboard") return pathname === href;
    return pathname === href || pathname.startsWith(`${href}/`);
  }

  return (
    <aside
      aria-label={copy.sidebar.ariaLabel}
      data-state={collapsed ? "collapsed" : "expanded"}
      data-testid="app-sidebar"
      className={cn(
        "fixed inset-y-0 left-0 z-40 hidden flex-col border-r bg-white transition-[width] duration-200 lg:flex",
        collapsed ? "w-20" : "w-60",
      )}
    >
      <div
        className={cn(
          "flex items-center border-b border-slate-100 px-3",
          collapsed
            ? "h-[92px] flex-col justify-center gap-2"
            : "h-[68px] justify-between",
        )}
      >
        <Logo
          compact={collapsed}
          ariaLabel={publicCopy.logo.ariaLabel}
          tagline={publicCopy.logo.tagline}
        />
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className={cn(
            "size-9 shrink-0 text-slate-500 hover:bg-olea-light hover:text-olea-dark",
            collapsed && "bg-white/90 shadow-sm",
          )}
          aria-label={collapsed ? copy.sidebar.expand : copy.sidebar.collapse}
          aria-controls="app-sidebar-navigation"
          aria-expanded={!collapsed}
          onClick={() => onCollapsedChange(!collapsed)}
        >
          <ToggleIcon className="size-4" />
        </Button>
      </div>

      {collapsed ? (
        <div className="px-2 pb-2 pt-4">
          <span
            className="mx-auto flex size-10 items-center justify-center rounded-full bg-green-100 text-lg"
            aria-label={copy.sidebar.workspaceLabel(tier)}
            title={`${organization?.name ?? "Olea Connects™"} · ${tier}`}
          >
            <Leaf className="size-5 text-green-700" aria-hidden="true" />
          </span>
        </div>
      ) : (
        <div className="px-4 pb-2 pt-4">
          <p
            data-testid="workspace-organization-name"
            className="truncate text-[14.5px] font-semibold text-slate-800"
          >
            {organization?.name ?? "Olea Connects™"}
          </p>
          <span className="mt-1.5 inline-flex items-center gap-1 rounded-full bg-green-100 px-2.5 py-1 text-xs font-semibold capitalize text-green-800">
            <Leaf className="size-3.5" aria-hidden="true" /> {tier}
          </span>
        </div>
      )}

      <nav
        id="app-sidebar-navigation"
        aria-label={copy.sidebar.primaryNavigation}
        className={cn(
          "flex-1 overflow-y-auto pb-3 pt-1",
          collapsed ? "px-2" : "px-3",
        )}
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
              const active = isActiveRoute(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  prefetch={item.href.startsWith("/api/") ? false : undefined}
                  aria-current={active ? "page" : undefined}
                  aria-label={collapsed ? item.label : undefined}
                  title={collapsed ? item.label : undefined}
                  className={cn(
                    "group relative flex w-full items-center rounded-lg text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100",
                    collapsed
                      ? "justify-center px-2 py-3"
                      : "gap-3 px-3 py-2.5",
                    active &&
                      "bg-olea-light font-semibold text-olea-dark shadow-[inset_3px_0_0_#446B52] hover:bg-olea-light",
                  )}
                >
                  <Icon className="size-5 shrink-0" strokeWidth={1.8} />
                  <span className={collapsed ? "sr-only" : "flex-1"}>
                    {item.label}
                  </span>
                  {collapsed ? (
                    <span
                      aria-hidden="true"
                      data-testid={getSidebarTooltipTestId(item.label)}
                      className="pointer-events-none absolute left-[calc(100%+0.5rem)] top-1/2 z-50 hidden -translate-y-1/2 whitespace-nowrap rounded-md border bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 shadow-elevated group-hover:block group-focus-visible:block"
                    >
                      {item.label}
                    </span>
                  ) : null}
                  {item.dot ? (
                    <span
                      className={cn(
                        "size-[7px] rounded-full bg-olea-orange",
                        collapsed && "absolute right-2 top-2",
                      )}
                    />
                  ) : null}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>
    </aside>
  );
}
