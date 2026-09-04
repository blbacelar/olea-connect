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

import { Field, noteFilterOptions, workflowStatusOptions } from "./workflow-utils";

export function StaffTaskFilters({
  dueFromFilter,
  dueToFilter,
  hasActiveFilters,
  notesFilter,
  relatedMeetingFilter,
  responsibleFilter,
  responsibleOptions,
  statusFilter,
  taskFilter,
  onClearFilters,
  onDueFromFilterChange,
  onDueToFilterChange,
  onNotesFilterChange,
  onRelatedMeetingFilterChange,
  onResponsibleFilterChange,
  onStatusFilterChange,
  onTaskFilterChange,
}: StaffTaskFiltersProps) {
  return (
    <div
      id="board-calendar-workflow-filters"
      className="grid gap-3 rounded-xl border bg-slate-50 p-4 md:grid-cols-2 xl:grid-cols-4"
    >
      <Field label="Task">
        <Input
          aria-label="Filter workflow tasks by task"
          value={taskFilter}
          placeholder="Task name"
          onChange={(event) => onTaskFilterChange(event.target.value)}
        />
      </Field>
      <Field label="Related meeting">
        <Input
          aria-label="Filter workflow tasks by related meeting"
          value={relatedMeetingFilter}
          placeholder="Meeting name"
          onChange={(event) => onRelatedMeetingFilterChange(event.target.value)}
        />
      </Field>
      <Field label="Due from">
        <Input
          aria-label="Filter workflow tasks due from"
          type="date"
          value={dueFromFilter}
          onChange={(event) => onDueFromFilterChange(event.target.value)}
        />
      </Field>
      <Field label="Due to">
        <Input
          aria-label="Filter workflow tasks due to"
          type="date"
          value={dueToFilter}
          onChange={(event) => onDueToFilterChange(event.target.value)}
        />
      </Field>
      <FilterSelect
        ariaLabel="Filter workflow tasks by responsible"
        label="Responsible"
        value={responsibleFilter}
        defaultItem="All responsible"
        options={responsibleOptions}
        onChange={onResponsibleFilterChange}
      />
      <FilterSelect
        ariaLabel="Filter workflow tasks by status"
        label="Status"
        value={statusFilter}
        defaultItem="All statuses"
        options={workflowStatusOptions}
        onChange={onStatusFilterChange}
      />
      <Field label="Notes">
        <Select value={notesFilter} onValueChange={onNotesFilterChange}>
          <SelectTrigger aria-label="Filter workflow tasks by notes">
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

function FilterSelect({
  ariaLabel,
  defaultItem,
  label,
  options,
  value,
  onChange,
}: {
  ariaLabel: string;
  defaultItem: string;
  label: string;
  options: string[];
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <Field label={label}>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger aria-label={ariaLabel}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">{defaultItem}</SelectItem>
          {options.map((option) => (
            <SelectItem key={option} value={option}>
              {option}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </Field>
  );
}

interface StaffTaskFiltersProps {
  dueFromFilter: string;
  dueToFilter: string;
  hasActiveFilters: boolean;
  notesFilter: string;
  relatedMeetingFilter: string;
  responsibleFilter: string;
  responsibleOptions: string[];
  statusFilter: string;
  taskFilter: string;
  onClearFilters: () => void;
  onDueFromFilterChange: (value: string) => void;
  onDueToFilterChange: (value: string) => void;
  onNotesFilterChange: (value: string) => void;
  onRelatedMeetingFilterChange: (value: string) => void;
  onResponsibleFilterChange: (value: string) => void;
  onStatusFilterChange: (value: string) => void;
  onTaskFilterChange: (value: string) => void;
}
