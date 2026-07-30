export type CommandItemType =
  | "page"
  | "template"
  | "module"
  | "community"
  | "resource";

export type CommandItem = {
  id: string;
  title: string;
  description: string;
  href: string;
  type: CommandItemType;
  keywords: string[];
};

export type RankedCommandItem = CommandItem & {
  score: number;
};

const baseCommandItems: CommandItem[] = [
  {
    id: "dashboard",
    title: "Dashboard",
    description: "Open your nonprofit home base.",
    href: "/dashboard",
    type: "page",
    keywords: ["home", "overview", "nonprofit"],
  },
  {
    id: "templates",
    title: "Templates",
    description: "Find branded governance templates and board-ready resources.",
    href: "/templates",
    type: "page",
    keywords: ["documents", "resources", "library", "pdf"],
  },
  {
    id: "board-calendar-module",
    title: "Board Calendar Module",
    description: "Plan meetings, workflows, packages, and board operations.",
    href: "/modules/board-calendar",
    type: "module",
    keywords: ["calendar", "workflow", "meetings", "board package"],
  },
  {
    id: "ed-review-module",
    title: "ED/CEO Annual Review",
    description: "Run anonymous staff and partner surveys with Board Chair reporting.",
    href: "/modules/ed-review",
    type: "module",
    keywords: ["ed", "ceo", "survey", "anonymous", "board chair", "feedback"],
  },
  {
    id: "community",
    title: "Community",
    description: "Join member discussions and spaces.",
    href: "/community",
    type: "community",
    keywords: ["posts", "spaces", "discussion", "network"],
  },
  {
    id: "grants",
    title: "Grants",
    description: "Explore Olea Gives opportunities and applications.",
    href: "/grants",
    type: "resource",
    keywords: ["funding", "olea gives", "applications"],
  },
  {
    id: "sponsors",
    title: "Sponsors",
    description: "Browse approved sponsors and Olea Gives contribution reporting.",
    href: "/sponsors",
    type: "resource",
    keywords: ["partners", "olea gives", "contributions", "funding"],
  },
  {
    id: "webinars",
    title: "Webinars",
    description: "See upcoming sessions, Zoom links, and recordings.",
    href: "/webinars",
    type: "resource",
    keywords: ["events", "recordings", "zoom", "sessions"],
  },
  {
    id: "consulting",
    title: "Consulting",
    description: "Submit Harvest requests, track hours, and review support activity.",
    href: "/consulting",
    type: "page",
    keywords: ["harvest", "support", "consultant", "hours", "requests"],
  },
  {
    id: "brand-profile",
    title: "Brand Profile",
    description: "Manage your logo, colors, and report identity.",
    href: "/settings/brand",
    type: "page",
    keywords: ["settings", "logo", "colors", "reports"],
  },
  {
    id: "team",
    title: "Team",
    description: "Invite members and manage workspace seats.",
    href: "/team",
    type: "page",
    keywords: ["members", "seats", "invites", "users"],
  },
  {
    id: "subscription",
    title: "Subscription",
    description: "Manage your plan, seats, and billing access.",
    href: "/subscription",
    type: "page",
    keywords: ["plan", "billing", "membership", "upgrade"],
  },
  {
    id: "help",
    title: "Help",
    description: "Get guides, answers, and support.",
    href: "/help",
    type: "resource",
    keywords: ["support", "faq", "contact", "guide"],
  },
  {
    id: "whats-new",
    title: "What's new",
    description: "Review product updates and newly released resources.",
    href: "/whats-new",
    type: "resource",
    keywords: ["updates", "release notes", "new"],
  },
  {
    id: "board-self-evaluation",
    title: "Board Self-Evaluation",
    description: "Annual survey template for board reflection and governance health.",
    href: "/templates/board-self-evaluation",
    type: "template",
    keywords: ["survey", "annual", "governance", "evaluation"],
  },
  {
    id: "board-calendar-operational-workflow",
    title: "Board Calendar & Operational Workflow",
    description: "Template workspace for meetings, preparation tasks, and board packages.",
    href: "/templates/board-calendar-operational-workflow",
    type: "template",
    keywords: ["calendar", "workflow", "meetings", "board package", "portal"],
  },
];

const commandTypeOrder: Record<CommandItemType, number> = {
  page: 0,
  module: 1,
  template: 2,
  community: 3,
  resource: 4,
};

function normalizeSearchText(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function scoreCommandItem(item: CommandItem, query: string) {
  const normalizedQuery = normalizeSearchText(query);
  if (!normalizedQuery) return 1;

  const haystack = normalizeSearchText(
    [item.title, item.description, item.type, ...item.keywords].join(" "),
  );
  const title = normalizeSearchText(item.title);
  const tokens = normalizedQuery.split(" ").filter(Boolean);

  if (!tokens.every((token) => haystack.includes(token))) return 0;

  let score = 10;
  if (title === normalizedQuery) score += 60;
  if (title.startsWith(normalizedQuery)) score += 40;
  if (haystack.includes(normalizedQuery)) score += 20;

  for (const token of tokens) {
    if (title.split(" ").some((part) => part.startsWith(token))) score += 10;
    if (item.keywords.some((keyword) => normalizeSearchText(keyword).includes(token))) {
      score += 5;
    }
  }

  return score;
}

export function getCommandItems() {
  return [...baseCommandItems];
}

export function filterCommandItems(
  query: string,
  items: CommandItem[] = baseCommandItems,
): RankedCommandItem[] {
  return items
    .map((item) => ({ ...item, score: scoreCommandItem(item, query) }))
    .filter((item) => item.score > 0)
    .sort((left, right) => {
      if (right.score !== left.score) return right.score - left.score;
      if (commandTypeOrder[left.type] !== commandTypeOrder[right.type]) {
        return commandTypeOrder[left.type] - commandTypeOrder[right.type];
      }
      return left.title.localeCompare(right.title);
    })
    .slice(0, 8);
}
