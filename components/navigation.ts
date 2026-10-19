import {
  BarChart3,
  BookOpen,
  CalendarDays,
  ClipboardList,
  ClipboardCheck,
  CircleHelp,
  ContactRound,
  CreditCard,
  Gift,
  Handshake,
  Home,
  Palette,
  ShieldCheck,
  Target,
  Users,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { getAppShellCopy } from "@/lib/i18n/app-shell-copy";
import type { Locale } from "@/lib/i18n/locales";
import type { MembershipTier, OrganizationRole, PlatformRole } from "@/lib/types";

export type NavigationItem = {
  dot?: boolean;
  href: string;
  icon: LucideIcon;
  label: string;
  requiredPlatformRole?: PlatformRole;
  requiredOrganizationRoles?: readonly OrganizationRole[];
  requiredTier?: "canopy";
};

export const navigationGroups: NavigationItem[][] = [
  [
    { label: "Dashboard", href: "/dashboard", icon: Home },
    {
      label: "Board Calendar",
      href: "/modules/board-calendar",
      icon: CalendarDays,
    },
    { label: "KPI Dashboard", href: "/modules/kpi-dashboard", icon: BarChart3 },
    { label: "Strategic Planning", href: "/modules/strategic-planning", icon: Target },
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
    { label: "Board Evaluation", href: "/modules/board-evaluation", icon: ClipboardCheck },
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
    { label: "Board Training", href: "/modules/board-training", icon: BookOpen, requiredTier: "canopy" },
    { label: "Community", href: "/community", icon: Users },
    { label: "Sponsors", href: "/sponsors", icon: Handshake },
    { label: "Webinars", href: "/webinars", icon: CalendarDays },
  ],
  [
    { label: "Brand Profile", href: "/settings/brand", icon: Palette },
    { label: "Team", href: "/team", icon: Users },
    { label: "Users Directory", href: "/users", icon: ContactRound },
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
  ],
];

export function getNavigationGroups(
  platformRoles: readonly PlatformRole[] = [],
  organizationRole?: OrganizationRole,
  locale: Locale = "en-CA",
  organizationTier?: MembershipTier,
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
                item.requiredOrganizationRoles.includes(organizationRole))) &&
            (!item.requiredTier || item.href === "/modules/board-training" || organizationTier === "canopy" || organizationTier === "harvest"),
        )
        .map((item) => ({
          ...item,
          label: copy.navigation[item.href] ?? item.label,
        })),
    )
    .filter((group) => group.length > 0);
}
