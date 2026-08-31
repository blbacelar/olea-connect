import { getAppShellCopy } from "@/lib/i18n/app-shell-copy";
import { defaultLocale, type Locale } from "@/lib/i18n/locales";

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

function buildBaseCommandItems(locale: Locale): CommandItem[] {
  const copy = getAppShellCopy(locale).searchItems;

  return [
  {
    id: "dashboard",
    title: copy.dashboard.title,
    description: copy.dashboard.description,
    href: "/dashboard",
    type: "page",
    keywords: copy.dashboard.keywords,
  },
  {
    id: "templates",
    title: copy.templates.title,
    description: copy.templates.description,
    href: "/templates",
    type: "page",
    keywords: copy.templates.keywords,
  },
  {
    id: "board-calendar-module",
    title: copy.boardCalendarModule.title,
    description: copy.boardCalendarModule.description,
    href: "/modules/board-calendar",
    type: "module",
    keywords: copy.boardCalendarModule.keywords,
  },
  {
    id: "ed-review-module",
    title: copy.edReviewModule.title,
    description: copy.edReviewModule.description,
    href: "/modules/ed-review",
    type: "module",
    keywords: copy.edReviewModule.keywords,
  },
  {
    id: "community",
    title: copy.community.title,
    description: copy.community.description,
    href: "/community",
    type: "community",
    keywords: copy.community.keywords,
  },
  {
    id: "grants",
    title: copy.grants.title,
    description: copy.grants.description,
    href: "/grants",
    type: "resource",
    keywords: copy.grants.keywords,
  },
  {
    id: "sponsors",
    title: copy.sponsors.title,
    description: copy.sponsors.description,
    href: "/sponsors",
    type: "resource",
    keywords: copy.sponsors.keywords,
  },
  {
    id: "webinars",
    title: copy.webinars.title,
    description: copy.webinars.description,
    href: "/webinars",
    type: "resource",
    keywords: copy.webinars.keywords,
  },
  {
    id: "consulting",
    title: copy.consulting.title,
    description: copy.consulting.description,
    href: "/consulting",
    type: "page",
    keywords: copy.consulting.keywords,
  },
  {
    id: "brand-profile",
    title: copy.brandProfile.title,
    description: copy.brandProfile.description,
    href: "/settings/brand",
    type: "page",
    keywords: copy.brandProfile.keywords,
  },
  {
    id: "team",
    title: copy.team.title,
    description: copy.team.description,
    href: "/team",
    type: "page",
    keywords: copy.team.keywords,
  },
  {
    id: "subscription",
    title: copy.subscription.title,
    description: copy.subscription.description,
    href: "/subscription",
    type: "page",
    keywords: copy.subscription.keywords,
  },
  {
    id: "help",
    title: copy.help.title,
    description: copy.help.description,
    href: "/help",
    type: "resource",
    keywords: copy.help.keywords,
  },
  {
    id: "whats-new",
    title: copy.whatsNew.title,
    description: copy.whatsNew.description,
    href: "/whats-new",
    type: "resource",
    keywords: copy.whatsNew.keywords,
  },
  {
    id: "board-self-evaluation",
    title: copy.boardSelfEvaluation.title,
    description: copy.boardSelfEvaluation.description,
    href: "/templates/board-self-evaluation",
    type: "template",
    keywords: copy.boardSelfEvaluation.keywords,
  },
  {
    id: "board-calendar-operational-workflow",
    title: copy.boardCalendarWorkflow.title,
    description: copy.boardCalendarWorkflow.description,
    href: "/templates/board-calendar-operational-workflow",
    type: "template",
    keywords: copy.boardCalendarWorkflow.keywords,
  },
  ];
}

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

export function getCommandItems(locale: Locale = defaultLocale) {
  return buildBaseCommandItems(locale);
}

export function filterCommandItems(
  query: string,
  items: CommandItem[] = buildBaseCommandItems(defaultLocale),
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
