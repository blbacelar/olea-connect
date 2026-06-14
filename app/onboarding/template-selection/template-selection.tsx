"use client";

import { Check, FileText } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";

import { PublicHeader } from "@/components/auth/PublicHeader";
import { Button } from "@/components/ui/button";
import type { Template } from "@/lib/types";
import { cn } from "@/lib/utils";

import { saveTemplateSelections } from "./actions";

export function TemplateSelection({ templates }: { templates: Template[] }) {
  const router = useRouter();
  const initialSelection = useMemo(
    () => templates.filter((template) => template.available).map(({ id }) => id),
    [templates],
  );
  const [selected, setSelected] = useState(initialSelection);
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  const toggle = (id: string) => {
    setError("");
    if (selected.includes(id)) {
      setSelected((current) => current.filter((item) => item !== id));
      return;
    }
    if (selected.length < 3) {
      setSelected((current) => [...current, id]);
    }
  };

  const confirm = () => {
    startTransition(async () => {
      try {
        await saveTemplateSelections(selected);
        router.push("/dashboard");
      } catch (selectionError) {
        setError(
          selectionError instanceof Error
            ? selectionError.message
            : "Unable to save your template selections.",
        );
      }
    });
  };

  return (
    <div className="min-h-screen bg-slate-100">
      <PublicHeader />
      <main className="mx-auto max-w-6xl px-4 py-10">
        <p className="text-sm font-semibold text-olea-green">Step 2 of 2</p>
        <h1 className="mt-1 text-3xl font-bold">Choose your 3 templates</h1>
        <p className="mt-2 max-w-3xl leading-6 text-slate-500">
          Your Seedling plan includes any 3 templates. These become your
          permanent set and can be changed once per year.
        </p>

        <div className="mt-6 max-w-md">
          <div className="flex justify-between text-sm">
            <span className="font-semibold">Selected: {selected.length} of 3</span>
            <span className="text-slate-400">
              {selected.length === 3 ? "Ready to confirm" : "Choose more"}
            </span>
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-200">
            <div
              className="h-full rounded-full bg-olea-green transition-all"
              style={{ width: `${(selected.length / 3) * 100}%` }}
            />
          </div>
        </div>

        {templates.length ? (
          <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {templates.map((template) => {
              const isSelected = selected.includes(template.id);
              const limitReached = selected.length === 3 && !isSelected;
              return (
                <button
                  key={template.id}
                  disabled={limitReached || isPending}
                  onClick={() => toggle(template.id)}
                  className={cn(
                    "relative min-h-[190px] rounded-xl border bg-white p-5 text-left shadow-soft transition",
                    isSelected && "border-[3px] border-olea-green bg-olea-light",
                    limitReached && "cursor-not-allowed opacity-50",
                  )}
                >
                  {isSelected ? (
                    <span className="absolute right-4 top-4 grid size-6 place-items-center rounded-full bg-olea-green text-white">
                      <Check className="size-4" />
                    </span>
                  ) : null}
                  <span className="grid size-11 place-items-center rounded-xl bg-olea-light text-olea-green">
                    <FileText className="size-5" />
                  </span>
                  <h2 className="mt-4 text-lg font-semibold">{template.name}</h2>
                  <p className="mt-1 text-sm text-slate-400">
                    {template.category}
                  </p>
                  <p className="mt-5 text-sm font-semibold text-olea-green">
                    {isSelected
                      ? "Selected"
                      : limitReached
                        ? "Limit reached"
                        : "Select"}
                  </p>
                </button>
              );
            })}
          </div>
        ) : (
          <p className="mt-8 rounded-xl border bg-white p-8 text-center text-slate-500">
            No templates are available for selection yet.
          </p>
        )}

        <div className="mt-8 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          Your selections are locked for 12 months. Choose carefully, or
          upgrade to Roots for the full template library.
        </div>
        {error ? (
          <p role="alert" className="mt-4 text-sm font-medium text-red-600">
            {error}
          </p>
        ) : null}
        <div className="mt-6 flex flex-wrap items-center gap-4">
          <Button
            size="lg"
            disabled={selected.length !== 3 || isPending}
            onClick={confirm}
          >
            {isPending ? "Saving..." : "Confirm my 3 templates →"}
          </Button>
          <button
            onClick={() => router.push("/subscription")}
            className="text-sm font-semibold text-olea-green"
          >
            Want all templates? Upgrade to Roots →
          </button>
        </div>
      </main>
    </div>
  );
}
