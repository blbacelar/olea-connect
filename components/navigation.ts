import {
  CalendarDays,
  CircleHelp,
  CreditCard,
  FileText,
  Gift,
  Home,
  Megaphone,
  MessagesSquare,
  Palette,
  ShieldCheck,
  Users,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import type { PlatformRole } from "@/lib/types";

export type NavigationItem = {
  dot?: boolean;
  href: string;
  icon: LucideIcon;
  label: string;
  requiredPlatformRole?: PlatformRole;
};

export const navigationGroups: NavigationItem[][] = [
  [
    { label: "Dashboard", href: "/dashboard", icon: Home },
    { label: "Templates", href: "/templates", icon: FileText, dot: true },
    { label: "Board Calendar", href: "/modules/board-calendar", icon: CalendarDays },
    { label: "Community", href: "/community", icon: Users },
    { label: "Grants", href: "/grants", icon: Gift },
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
  ],
  [
    { label: "Help", href: "/help", icon: CircleHelp },
    { label: "What's new", href: "/whats-new", icon: Megaphone },
  ],
];

export function getNavigationGroups(platformRoles: readonly PlatformRole[] = []) {
  const roleSet = new Set(platformRoles);

  return navigationGroups
    .map((group) =>
      group.filter(
        (item) =>
          !item.requiredPlatformRole || roleSet.has(item.requiredPlatformRole),
      ),
    )
    .filter((group) => group.length > 0);
}
