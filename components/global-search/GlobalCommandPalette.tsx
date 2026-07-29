"use client";

import { ArrowRight, FileSearch, Search } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

import {
  filterCommandItems,
  getCommandItems,
  type RankedCommandItem,
} from "@/components/global-search/search-items";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const typeLabel: Record<RankedCommandItem["type"], string> = {
  page: "Page",
  module: "Module",
  template: "Template",
  community: "Community",
  resource: "Resource",
};

function isSearchShortcut(event: KeyboardEvent) {
  return (event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k";
}

export function GlobalCommandPalette() {
  const router = useRouter();
  const pathname = usePathname();
  const inputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const items = useMemo(() => getCommandItems(), []);
  const results = useMemo(() => filterCommandItems(query, items), [items, query]);
  const activeItem = results[activeIndex];

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (isSearchShortcut(event)) {
        event.preventDefault();
        setOpen(true);
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    if (!open) return;

    const frame = window.requestAnimationFrame(() => {
      inputRef.current?.focus();
    });

    return () => window.cancelAnimationFrame(frame);
  }, [open]);

  useEffect(() => {
    setOpen(false);
    setQuery("");
    setActiveIndex(0);
  }, [pathname]);

  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  function closePalette() {
    setOpen(false);
    setQuery("");
    setActiveIndex(0);
  }

  function openPalette() {
    setOpen(true);
  }

  function selectItem(item: RankedCommandItem | undefined) {
    if (!item) return;

    closePalette();
    router.push(item.href);
  }

  function onPaletteKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    if (event.key === "Escape") {
      event.preventDefault();
      closePalette();
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((index) =>
        results.length === 0 ? 0 : (index + 1) % results.length,
      );
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((index) =>
        results.length === 0
          ? 0
          : (index - 1 + results.length) % results.length,
      );
      return;
    }

    if (event.key === "Enter") {
      event.preventDefault();
      selectItem(activeItem);
    }
  }

  return (
    <>
      <button
        type="button"
        aria-label="Open global search"
        onClick={openPalette}
        className="relative hidden h-10 w-full max-w-[360px] items-center rounded-lg border bg-slate-50 pl-9 pr-16 text-left text-sm text-slate-600 outline-none transition hover:border-olea-green/60 hover:bg-white focus:border-olea-green focus:ring-2 focus:ring-olea-green/20 md:flex xl:max-w-[420px]"
      >
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
        <span>Search templates, posts, resources</span>
        <kbd className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded border bg-white px-1.5 py-0.5 font-mono text-[11px] text-slate-600">
          ⌘K
        </kbd>
      </button>

      <Button
        type="button"
        variant="outline"
        size="icon"
        aria-label="Open global search"
        onClick={openPalette}
        className="rounded-lg md:hidden"
      >
        <Search className="size-[18px]" />
      </Button>

      {open ? (
        <div
          className="fixed inset-0 z-[80] bg-slate-950/45 px-3 py-4 backdrop-blur-sm sm:py-[12vh]"
          role="dialog"
          aria-modal="true"
          aria-label="Global search"
          onKeyDown={onPaletteKeyDown}
        >
          <button
            type="button"
            aria-label="Close global search"
            className="absolute inset-0 cursor-default"
            onClick={closePalette}
          />
          <div className="relative mx-auto max-w-2xl overflow-hidden rounded-2xl border border-white/30 bg-white shadow-elevated">
            <div className="flex items-center gap-3 border-b px-4 py-3">
              <Search className="size-5 shrink-0 text-slate-400" />
              <input
                ref={inputRef}
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                aria-label="Search command palette"
                aria-controls="global-command-palette-results"
                aria-activedescendant={activeItem ? `command-${activeItem.id}` : undefined}
                role="combobox"
                aria-expanded="true"
                aria-autocomplete="list"
                placeholder="Jump to a page, template, or resource..."
                className="h-11 flex-1 bg-transparent text-[16px] text-slate-900 outline-none placeholder:text-slate-400"
              />
              <kbd className="hidden rounded border bg-slate-50 px-2 py-1 text-xs font-semibold text-slate-500 sm:inline">
                Esc
              </kbd>
            </div>

            <div
              id="global-command-palette-results"
              role="listbox"
              aria-label="Global search results"
              className="max-h-[60vh] overflow-y-auto p-2"
            >
              {results.length > 0 ? (
                results.map((item, index) => (
                  <button
                    key={item.id}
                    id={`command-${item.id}`}
                    type="button"
                    role="option"
                    aria-selected={index === activeIndex}
                    onMouseEnter={() => setActiveIndex(index)}
                    onClick={() => selectItem(item)}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition",
                      index === activeIndex
                        ? "bg-olea-light text-olea-dark"
                        : "text-slate-700 hover:bg-slate-50",
                    )}
                  >
                    <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-white text-olea-green shadow-sm ring-1 ring-slate-200">
                      <FileSearch className="size-5" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold text-slate-900">
                          {item.title}
                        </span>
                        <span className="rounded-full border bg-white px-2 py-0.5 text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500">
                          {typeLabel[item.type]}
                        </span>
                      </span>
                      <span className="mt-1 block truncate text-sm text-slate-500">
                        {item.description}
                      </span>
                    </span>
                    <ArrowRight className="size-4 shrink-0 text-slate-400" />
                  </button>
                ))
              ) : (
                <div className="px-5 py-12 text-center">
                  <p className="font-semibold text-slate-800">
                    No matching results
                  </p>
                  <p className="mt-1 text-sm text-slate-500">
                    Try searching for “templates”, “webinars”, “team”, or a board
                    resource.
                  </p>
                </div>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-3 border-t bg-slate-50 px-4 py-2.5 text-xs text-slate-500">
              <span>↑↓ move</span>
              <span>Enter open</span>
              <span>Esc close</span>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
