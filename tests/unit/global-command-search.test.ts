import { describe, expect, it } from "vitest";

import {
  filterCommandItems,
  type CommandItem,
} from "@/components/global-search/search-items";

const items: CommandItem[] = [
  {
    id: "templates",
    title: "Templates",
    description: "Find documents",
    href: "/templates",
    type: "page",
    keywords: ["documents", "library"],
  },
  {
    id: "board-calendar",
    title: "Board Calendar",
    description: "Plan board operations",
    href: "/modules/board-calendar",
    type: "module",
    keywords: ["workflow", "meetings"],
  },
  {
    id: "webinars",
    title: "Webinars",
    description: "Zoom events and recordings",
    href: "/webinars",
    type: "resource",
    keywords: ["events"],
  },
];

describe("global command search", () => {
  it("returns the most relevant title match first", () => {
    const results = filterCommandItems("board cal", items);

    expect(results.map((item) => item.id)).toEqual(["board-calendar"]);
  });

  it("matches across descriptions and keywords", () => {
    const results = filterCommandItems("zoom", items);

    expect(results[0]).toMatchObject({
      id: "webinars",
      href: "/webinars",
    });
  });

  it("returns an empty result set when no token matches", () => {
    expect(filterCommandItems("definitely missing", items)).toEqual([]);
  });
});
