"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { GlobalCommandPalette } from "@/components/global-search/GlobalCommandPalette";
import { HeaderMobileNavigation } from "@/components/header-mobile-nav";
import { HeaderNotifications } from "@/components/header-notifications";
import { HeaderUserMenu } from "@/components/header-user-menu";
import { LocaleSelector } from "@/components/i18n/LocaleSelector";
import { useLocaleContext } from "@/components/i18n/LocaleProvider";
import { Logo } from "@/components/Logo";
import { getNavigationGroups } from "@/components/navigation";
import { useRegistration } from "@/hooks/use-registration";
import { useSession } from "@/hooks/use-session";
import { getAppShellCopy } from "@/lib/i18n/app-shell-copy";
import { getPublicSiteCopy } from "@/lib/i18n/public-site-copy";
import type { Member } from "@/lib/types";

export function Header() {
  const router = useRouter();
  const session = useSession();
  const { locale } = useLocaleContext();
  const copy = getAppShellCopy(locale);
  const publicCopy = getPublicSiteCopy(locale);
  const member = session?.member;
  const navigationGroups = getNavigationGroups(
    session?.platformRoles,
    session?.member.membershipRole,
    locale,
  );
  const { resetRegistration } = useRegistration();
  const [notificationCloseRequest, setNotificationCloseRequest] = useState(0);
  const [userOpen, setUserOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="relative z-30 flex h-16 shrink-0 items-center gap-3 border-b bg-white px-4 md:gap-4 md:px-6">
      <div className="lg:hidden">
        <Logo
          compact
          ariaLabel={publicCopy.logo.ariaLabel}
          tagline={publicCopy.logo.tagline}
        />
      </div>

      <GlobalCommandPalette />
      <div className="flex-1" />

      <div className="hidden sm:block">
        <LocaleSelector />
      </div>

      <HeaderNotifications
        closeRequest={notificationCloseRequest}
        copy={copy.header}
        initialItems={session?.notifications.items ?? []}
        initialUnreadCount={session?.notifications.unreadCount ?? 0}
        locale={locale}
        memberId={member?.id}
        onUserMenuClose={() => setUserOpen(false)}
        router={router}
      />

      <HeaderUserMenu
        copy={copy.header}
        initials={getInitials(member, copy.header.member)}
        member={member}
        onNotificationsClose={() =>
          setNotificationCloseRequest((request) => request + 1)
        }
        onOpenChange={setUserOpen}
        open={userOpen}
        resetRegistration={resetRegistration}
        router={router}
      />

      <HeaderMobileNavigation
        copy={copy.header}
        logo={publicCopy.logo}
        navigationGroups={navigationGroups}
        onOpenChange={setMobileOpen}
        open={mobileOpen}
      />
    </header>
  );
}

function getInitials(member: Member | undefined, fallback: string) {
  return (member?.name ?? fallback)
    .split(/\s+/)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}
