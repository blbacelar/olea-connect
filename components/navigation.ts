import {
  BarChart3,
  CalendarDays,
  ClipboardList,
  CircleHelp,
  CreditCard,
  FileText,
  Gift,
  Handshake,
  Home,
  Megaphone,
  MessagesSquare,
  Palette,
  ShieldCheck,
  Users,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { getAppShellCopy } from "@/lib/i18n/app-shell-copy";
import type { Locale } from "@/lib/i18n/locales";
import type { OrganizationRole, PlatformRole } from "@/lib/types";

export type NavigationItem = {
  dot?: boolean;
  href: string;
  icon: LucideIcon;
  label: string;
  requiredPlatformRole?: PlatformRole;
  requiredOrganizationRoles?: readonly OrganizationRole[];
};

export const navigationGroups: NavigationItem[][] = [
  [
    { label: "Dashboard", href: "/dashboard", icon: Home },
    { label: "Templates", href: "/templates", icon: FileText, dot: true },
    {
      label: "Board Calendar",
      href: "/modules/board-calendar",
      icon: CalendarDays,
    },
    { label: "KPI Dashboard", href: "/modules/kpi-dashboard", icon: BarChart3 },
    {
      label: "Board Recruitment",
      href: "/modules/board-recruitment",
      icon: Users,
      requiredOrganizationRoles: ["owner", "admin"],
    },
    {
      label: "Accreditation",
      href: "/modules/accreditation",
      icon: ShieldCheck,
    },
    {
      label: "Grant Platform",
      href: "/modules/grant-platform",
      icon: Gift,
    },
    {
      label: "ED Review",
      href: "/modules/ed-review",
      icon: ClipboardList,
      requiredOrganizationRoles: ["owner", "admin"],
    },
    { label: "Community", href: "/community", icon: Users },
    { label: "Grants", href: "/grants", icon: Gift },
    { label: "Sponsors", href: "/sponsors", icon: Handshake },
    { label: "Webinars", href: "/webinars", icon: CalendarDays },
    { label: "Consulting", href: "/consulting", icon: MessagesSquare },
  ],
  [
    { label: "Brand Profile", href: "/settings/brand", icon: Palette },
    { label: "Team", href: "/team", icon: Users },
    { label: "Subscription", href: "/subscription", icon: CreditCard },
    {
      label: "Operations",
      href: "/settings/integrations",
      icon: ShieldCheck,
      requiredPlatformRole: "super_admin",
    },
    {
      label: "Referrals",
      href: "/settings/referrals",
      icon: Handshake,
      requiredPlatformRole: "super_admin",
    },
  ],
  [
    { label: "Help", href: "/help", icon: CircleHelp },
    { label: "What's new", href: "/whats-new", icon: Megaphone },
  ],
];

export function getNavigationGroups(
  platformRoles: readonly PlatformRole[] = [],
  organizationRole?: OrganizationRole,
  locale: Locale = "en-CA",
) {
  const copy = getAppShellCopy(locale);
  const roleSet = new Set(platformRoles);

  return navigationGroups
    .map((group) =>
      group
        .filter(
          (item) =>
            (!item.requiredPlatformRole ||
              roleSet.has(item.requiredPlatformRole)) &&
            (!item.requiredOrganizationRoles ||
              (organizationRole !== undefined &&
                item.requiredOrganizationRoles.includes(organizationRole))),
        )
        .map((item) => ({
          ...item,
          label: copy.navigation[item.href] ?? item.label,
        })),
    )
    .filter((group) => group.length > 0);
}
