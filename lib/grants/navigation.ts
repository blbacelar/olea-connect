import { Gift, LayoutGrid, MessageSquareMore, ReceiptText, Settings2, Sparkles, Users } from "lucide-react";

export type GrantPlatformNavItem = {
  id: string;
  label: string;
  description: string;
  icon: string;
  href: string;
};

export const grantPlatformNavigationItems: GrantPlatformNavItem[] = [
  {
    id: "pipeline",
    label: "Grant Pipeline",
    description: "Manage opportunities, statuses, and next steps.",
    icon: "Gift",
    href: "/modules/grant-platform?tab=pipeline",
  },
  {
    id: "dashboard",
    label: "Dashboard",
    description: "See portfolio health and funding progress.",
    icon: "LayoutGrid",
    href: "/modules/grant-platform?tab=overview",
  },
  {
    id: "coaching",
    label: "Writing Tips",
    description: "Coaching support for planning and drafting.",
    icon: "Sparkles",
    href: "/modules/grant-platform?tab=overview",
  },
  {
    id: "reports",
    label: "Funder Reports",
    description: "Review performance insights and exports.",
    icon: "ReceiptText",
    href: "/modules/grant-platform?tab=reports",
  },
  {
    id: "partners",
    label: "Partners",
    description: "Track collaborators and partner relationships.",
    icon: "Users",
    href: "/modules/grant-platform?tab=settings",
  },
  {
    id: "settings",
    label: "Org Settings",
    description: "Manage team access and organization details.",
    icon: "Settings2",
    href: "/modules/grant-platform?tab=settings",
  },
];
