"use client";

import { Check, FileText } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";

import { OnboardingHeader } from "@/components/onboarding/OnboardingHeader";
import { Button } from "@/components/ui/button";
import type { Template } from "@/lib/types";
import { cn } from "@/lib/utils";

import { saveTemplateSelections } from "./actions";

const dateFormatter = new Intl.DateTimeFormat("en-CA", {
  month: "short",
  day: "numeric",
  year: "numeric",
});

function formatTemplateDate(value?: string | null) {
  if (!value) return null;
  return dateFormatter.format(new Date(value));
}

function isTemplateLocked(value?: string | null) {
  return Boolean(value && new Date(value).getTime() > Date.now());
}

export function TemplateSelection({ templates }: { templates: Template[] }) {
  const router = useRouter();
  const selectionLimit = Math.min(3, templates.length);
  const hasSelectableTemplates = selectionLimit > 0;
  const initialSelection = useMemo(
    () => templates.filter((template) => template.available).map(({ id }) => id),
    [templates],
  );
  const [selected, setSelected] = useState(initialSelection);
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  const toggle = (id: string) => {
    setError("");
    const template = templates.find((item) => item.id === id);
    if (isTemplateLocked(template?.lockedUntil)) return;

    if (selected.includes(id)) {
      setSelected((current) => current.filter((item) => item !== id));
      return;
    }
    if (selected.length < selectionLimit) {
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
      <OnboardingHeader />
      <main className="mx-auto max-w-6xl px-4 py-10">
        <p className="text-sm font-semibold text-olea-green">Step 2 of 2</p>
        <h1 className="mt-1 text-3xl font-bold">
          <SelectionTitle
            hasSelectableTemplates={hasSelectableTemplates}
            selectionLimit={selectionLimit}
          />
        </h1>
        <p className="mt-2 max-w-3xl leading-6 text-slate-500">
          <SelectionDescription hasSelectableTemplates={hasSelectableTemplates} />
        </p>

        <SelectionProgress
          hasSelectableTemplates={hasSelectableTemplates}
          selectedCount={selected.length}
          selectionLimit={selectionLimit}
        />

        <TemplateSelectionGrid
          isPending={isPending}
          onToggle={toggle}
          selected={selected}
          selectionLimit={selectionLimit}
          templates={templates}
        />

        <div className="mt-8 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          Your selections are locked for 12 months. Choose carefully, or
          upgrade to Roots for the full template library.
        </div>
        <SelectionActions
          error={error}
          hasSelectableTemplates={hasSelectableTemplates}
          isPending={isPending}
          onConfirm={confirm}
          onUpgrade={() => router.push("/subscription")}
          selectedCount={selected.length}
        />
      </main>
    </div>
  );
}

function SelectionTitle({
  hasSelectableTemplates,
  selectionLimit,
}: {
  hasSelectableTemplates: boolean;
  selectionLimit: number;
}) {
  return hasSelectableTemplates
    ? `Choose up to ${selectionLimit} templates`
    : "Templates are coming soon";
}

function SelectionDescription({
  hasSelectableTemplates,
}: {
  hasSelectableTemplates: boolean;
}) {
  return hasSelectableTemplates
    ? "Your Seedling plan includes up to 3 templates. Choose at least one. These become your permanent set and can be changed once per year."
    : "We will let you know as soon as Seedling templates are available.";
}

function SelectionProgress({
  hasSelectableTemplates,
  selectedCount,
  selectionLimit,
}: {
  hasSelectableTemplates: boolean;
  selectedCount: number;
  selectionLimit: number;
}) {
  if (!hasSelectableTemplates) return null;

  return (
    <div className="mt-6 max-w-md">
      <div className="flex justify-between text-sm">
        <span className="font-semibold">
          Selected: {selectedCount} of {selectionLimit}
        </span>
        <span className="text-slate-400">
          {selectedCount > 0 ? "Ready to confirm" : "Choose at least one"}
        </span>
      </div>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-200">
        <div
          className="h-full rounded-full bg-olea-green transition-all"
          style={{
            width: `${(selectedCount / selectionLimit) * 100}%`,
          }}
        />
      </div>
    </div>
  );
}

function TemplateSelectionGrid({
  isPending,
  onToggle,
  selected,
  selectionLimit,
  templates,
}: {
  isPending: boolean;
  onToggle: (id: string) => void;
  selected: string[];
  selectionLimit: number;
  templates: Template[];
}) {
  if (!templates.length) {
    return (
      <p className="mt-8 rounded-xl border bg-white p-8 text-center text-slate-500">
        No templates are available for selection yet.
      </p>
    );
  }

  return (
    <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {templates.map((template) => (
        <TemplateSelectionCard
          key={template.id}
          isPending={isPending}
          isSelected={selected.includes(template.id)}
          limitReached={
            selected.length === selectionLimit && !selected.includes(template.id)
          }
          onToggle={onToggle}
          template={template}
        />
      ))}
    </div>
  );
}

function TemplateSelectionCard({
  isPending,
  isSelected,
  limitReached,
  onToggle,
  template,
}: {
  isPending: boolean;
  isSelected: boolean;
  limitReached: boolean;
  onToggle: (id: string) => void;
  template: Template;
}) {
  const isLocked = isTemplateLocked(template.lockedUntil);

  return (
    <button
      disabled={isLocked || limitReached || isPending}
      onClick={() => onToggle(template.id)}
      className={cn(
        "relative min-h-[190px] rounded-xl border bg-white p-5 text-left shadow-soft transition",
        isSelected && "border-[3px] border-olea-green bg-olea-light",
        isLocked && "cursor-not-allowed",
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
      <p className="mt-1 text-sm text-slate-400">{template.category}</p>
      <TemplateAvailabilityList template={template} />
      <p className="mt-5 text-sm font-semibold text-olea-green">
        <TemplateSelectionStatus
          isLocked={isLocked}
          isSelected={isSelected}
          limitReached={limitReached}
        />
      </p>
    </button>
  );
}

function TemplateAvailabilityList({ template }: { template: Template }) {
  const dates = [
    ["Available", formatTemplateDate(template.availableAt)],
    ["Selected", formatTemplateDate(template.selectedAt)],
    ["Locked until", formatTemplateDate(template.lockedUntil)],
  ].filter((entry): entry is [string, string] => Boolean(entry[1]));

  return (
    <dl className="mt-4 space-y-1 text-xs text-slate-500">
      {dates.map(([label, value]) => (
        <div key={label} className="flex justify-between gap-3">
          <dt>{label}</dt>
          <dd className="font-medium text-slate-600">{value}</dd>
        </div>
      ))}
    </dl>
  );
}

function TemplateSelectionStatus({
  isLocked,
  isSelected,
  limitReached,
}: {
  isLocked: boolean;
  isSelected: boolean;
  limitReached: boolean;
}) {
  if (isLocked) return "Locked";
  if (isSelected) return "Selected";
  return limitReached ? "Limit reached" : "Select";
}

function SelectionActions({
  error,
  hasSelectableTemplates,
  isPending,
  onConfirm,
  onUpgrade,
  selectedCount,
}: {
  error: string;
  hasSelectableTemplates: boolean;
  isPending: boolean;
  onConfirm: () => void;
  onUpgrade: () => void;
  selectedCount: number;
}) {
  return (
    <>
      {error ? (
        <p role="alert" className="mt-4 text-sm font-medium text-red-600">
          {error}
        </p>
      ) : null}
      <div className="mt-6 flex flex-wrap items-center gap-4">
        {hasSelectableTemplates ? (
          <Button
            size="lg"
            disabled={selectedCount === 0 || isPending}
            onClick={onConfirm}
          >
            {isPending
              ? "Saving..."
              : `Confirm my ${selectedCount} ${
                  selectedCount === 1 ? "template" : "templates"
                } →`}
          </Button>
        ) : null}
        <Button variant="link" className="px-0" onClick={onUpgrade}>
          Want all templates? Upgrade to Roots →
        </Button>
      </div>
    </>
  );
}
