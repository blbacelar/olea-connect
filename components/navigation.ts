import {
  CalendarDays,
  CircleHelp,
  CreditCard,
  FileText,
  Gift,
  Home,
  Megaphone,
  Palette,
  Users,
} from "lucide-react";

import { apiRoutes } from "@/lib/api-routes";

export const navigationGroups = [
  [
    { label: "Dashboard", href: "/dashboard", icon: Home },
    { label: "Templates", href: "/templates", icon: FileText, dot: true },
    { label: "Community", href: apiRoutes.circleSso, icon: Users },
    { label: "Grants", href: "/grants", icon: Gift },
    { label: "Webinars", href: "/webinars", icon: CalendarDays },
  ],
  [
    { label: "Brand Profile", href: "/settings/brand", icon: Palette },
    { label: "Team", href: "/team", icon: Users },
    { label: "Subscription", href: "/subscription", icon: CreditCard },
  ],
  [
    { label: "Help", href: "/help", icon: CircleHelp },
    { label: "What's new", href: "/whats-new", icon: Megaphone },
  ],
];
