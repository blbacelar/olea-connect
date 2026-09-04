"use client";

import { Menu, X } from "lucide-react";
import Link from "next/link";

import { LocaleSelector } from "@/components/i18n/LocaleSelector";
import { Logo } from "@/components/Logo";
import { getNavigationGroups } from "@/components/navigation";
import { Button } from "@/components/ui/button";

type NavigationGroups = ReturnType<typeof getNavigationGroups>;

type MobileNavigationCopy = {
  closeNavigation: string;
  openNavigation: string;
};

type LogoCopy = {
  ariaLabel: string;
  tagline: string;
};

export function HeaderMobileNavigation({
  copy,
  logo,
  navigationGroups,
  onOpenChange,
  open,
}: {
  copy: MobileNavigationCopy;
  logo: LogoCopy;
  navigationGroups: NavigationGroups;
  onOpenChange: (open: boolean) => void;
  open: boolean;
}) {
  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        className="lg:hidden"
        aria-label={copy.openNavigation}
        onClick={() => onOpenChange(true)}
      >
        <Menu className="size-5" />
      </Button>
      {open ? (
        <MobileNavigationOverlay
          copy={copy}
          logo={logo}
          navigationGroups={navigationGroups}
          onOpenChange={onOpenChange}
        />
      ) : null}
    </>
  );
}

function MobileNavigationOverlay({
  copy,
  logo,
  navigationGroups,
  onOpenChange,
}: {
  copy: MobileNavigationCopy;
  logo: LogoCopy;
  navigationGroups: NavigationGroups;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <div className="fixed inset-0 z-50 lg:hidden">
      <button
        aria-label={copy.closeNavigation}
        className="absolute inset-0 bg-slate-900/30"
        onClick={() => onOpenChange(false)}
      />
      <div className="relative h-full w-[280px] bg-white p-4 shadow-elevated">
        <div className="flex items-center justify-between border-b pb-4">
          <Logo ariaLabel={logo.ariaLabel} tagline={logo.tagline} />
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onOpenChange(false)}
            aria-label={copy.closeNavigation}
          >
            <X className="size-5" />
          </Button>
        </div>
        <div className="mt-4">
          <LocaleSelector />
        </div>
        <nav className="mt-3">
          {navigationGroups.map((group, groupIndex) => (
            <MobileNavigationGroup
              group={group}
              groupIndex={groupIndex}
              key={groupIndex}
              onClose={() => onOpenChange(false)}
            />
          ))}
        </nav>
      </div>
    </div>
  );
}

function MobileNavigationGroup({
  group,
  groupIndex,
  onClose,
}: {
  group: NavigationGroups[number];
  groupIndex: number;
  onClose: () => void;
}) {
  return (
    <div
      className="space-y-1 border-b border-slate-100 py-2 last:border-0"
      key={groupIndex}
    >
      {group.map((item) => {
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            prefetch={item.href.startsWith("/api/") ? false : undefined}
            onClick={onClose}
            className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-600 hover:bg-olea-light hover:text-olea-dark"
          >
            <Icon className="size-5" />
            {item.label}
          </Link>
        );
      })}
    </div>
  );
}
