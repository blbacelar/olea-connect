"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { Field, noteFilterOptions } from "./workflow-utils";

export function DirectoryFilters({
  chairFilter,
  committeeFilter,
  hasActiveFilters,
  notesFilter,
  onChairFilterChange,
  onClearFilters,
  onCommitteeFilterChange,
  onNotesFilterChange,
}: {
  chairFilter: string;
  committeeFilter: string;
  hasActiveFilters: boolean;
  notesFilter: string;
  onChairFilterChange: (value: string) => void;
  onClearFilters: () => void;
  onCommitteeFilterChange: (value: string) => void;
  onNotesFilterChange: (value: string) => void;
}) {
  return (
    <div
      id="board-calendar-directory-filters"
      className="grid gap-3 rounded-xl border bg-slate-50 p-4 md:grid-cols-2 xl:grid-cols-4"
    >
      <Field label="Committee">
        <Input
          aria-label="Filter directory by committee"
          value={committeeFilter}
          placeholder="Committee name"
          onChange={(event) => onCommitteeFilterChange(event.target.value)}
        />
      </Field>
      <Field label="Chair">
        <Input
          aria-label="Filter directory by chair"
          value={chairFilter}
          placeholder="Chair name"
          onChange={(event) => onChairFilterChange(event.target.value)}
        />
      </Field>
      <Field label="Notes">
        <Select value={notesFilter} onValueChange={onNotesFilterChange}>
          <SelectTrigger aria-label="Filter directory by notes">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {noteFilterOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>
      <div className="flex items-end">
        <Button
          type="button"
          variant="ghost"
          className="w-full"
          disabled={!hasActiveFilters}
          onClick={onClearFilters}
        >
          Clear filters
        </Button>
      </div>
    </div>
  );
}
