"use client";

import { Search } from "lucide-react";
import { useMemo, useState } from "react";

import { PageHeader } from "@/components/PageHeader";
import { TemplateCard } from "@/components/TemplateCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { Template } from "@/lib/types";
import { cn } from "@/lib/utils";

const categories = ["All", "Governance", "Board Operations", "People", "Policy"];

export function TemplateLibrary({ templates }: { templates: Template[] }) {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");

  const filteredTemplates = useMemo(() => {
    const query = search.trim().toLowerCase();
    return templates
      .filter(
        (template) =>
          (category === "All" || template.category === category) &&
          (!query ||
            template.name.toLowerCase().includes(query) ||
            template.category.toLowerCase().includes(query)),
      )
      .toSorted((left, right) => Number(left.available) - Number(right.available))
      .reverse();
  }, [category, search, templates]);

  const lockedCount = filteredTemplates.filter(
    (template) => !template.available,
  ).length;

  return (
    <div>
      <PageHeader
        title="Templates"
        description="Branded, board-ready governance documents — yours to fill out and download."
        action={
          <div className="relative w-full sm:w-[280px]">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search templates"
              className="pl-9"
            />
          </div>
        }
      />

      <div className="mb-[18px] flex flex-wrap gap-2">
        {categories.map((item) => (
          <Button
            key={item}
            size="sm"
            variant={category === item ? "default" : "outline"}
            onClick={() => setCategory(item)}
            className={cn(
              "rounded-lg px-4",
              category !== item && "border-slate-200",
            )}
          >
            {item}
          </Button>
        ))}
      </div>

      <p className="mb-4 text-[13px] text-slate-500">
        Showing {filteredTemplates.length} templates — {lockedCount} locked
      </p>

      {filteredTemplates.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filteredTemplates.map((template) => (
            <TemplateCard key={template.id} template={template} />
          ))}
        </div>
      ) : (
        <div className="rounded-xl border bg-white px-5 py-16 text-center shadow-soft">
          <p className="font-semibold text-slate-700">
            No templates match your search.
          </p>
          <Button
            variant="outline"
            className="mt-4 border-olea-green text-olea-green"
            onClick={() => {
              setSearch("");
              setCategory("All");
            }}
          >
            Clear filters
          </Button>
        </div>
      )}
    </div>
  );
}
