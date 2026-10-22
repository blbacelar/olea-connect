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

import {
  agmTrackOptions,
  Field,
  noteFilterOptions,
  workflowStatusOptions,
} from "./workflow-utils";

export function AgmMilestoneFilters(props: AgmMilestoneFiltersProps) {
  return (
    <div
      id="board-calendar-agm-filters"
      className="grid gap-3 rounded-xl border bg-slate-50 p-4 md:grid-cols-2 xl:grid-cols-4"
    >
      <Field label="Task">
        <Input
          aria-label="Filter AGM milestones by task"
          value={props.taskFilter}
          placeholder="Milestone name"
          onChange={(event) => props.onTaskFilterChange(event.target.value)}
        />
      </Field>
      <DateFilter
        label="Target from"
        ariaLabel="Filter AGM milestones target from"
        value={props.targetFromFilter}
        onChange={props.onTargetFromFilterChange}
      />
      <DateFilter
        label="Target to"
        ariaLabel="Filter AGM milestones target to"
        value={props.targetToFilter}
        onChange={props.onTargetToFilterChange}
      />
      <FilterSelect
        ariaLabel="Filter AGM milestones by track"
        defaultItem="All tracks"
        label="Track"
        options={agmTrackOptions}
        value={props.trackFilter}
        onChange={props.onTrackFilterChange}
      />
      <FilterSelect
        ariaLabel="Filter AGM milestones by responsible"
        defaultItem="All responsible"
        label="Responsible"
        options={props.responsibleOptions}
        value={props.responsibleFilter}
        onChange={props.onResponsibleFilterChange}
      />
      <FilterSelect
        ariaLabel="Filter AGM milestones by status"
        defaultItem="All statuses"
        label="Status"
        options={workflowStatusOptions}
        value={props.statusFilter}
        onChange={props.onStatusFilterChange}
      />
      <OptionSelect
        ariaLabel="Filter AGM milestones by notes"
        label="Notes"
        options={noteFilterOptions}
        value={props.notesFilter}
        onChange={props.onNotesFilterChange}
      />
      <OptionSelect
        ariaLabel="Filter AGM milestones by done"
        label="Done"
        options={[
          { label: "All milestones", value: "all" },
          { label: "Done", value: "done" },
          { label: "Not done", value: "not_done" },
        ]}
        value={props.doneFilter}
        onChange={props.onDoneFilterChange}
      />
      <div className="flex items-end">
        <Button
          type="button"
          variant="ghost"
          className="w-full"
          disabled={!props.hasActiveFilters}
          onClick={props.onClearFilters}
        >
          Clear filters
        </Button>
      </div>
    </div>
  );
}

function DateFilter({
  ariaLabel,
  label,
  value,
  onChange,
}: {
  ariaLabel: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <Field label={label}>
      <Input
        aria-label={ariaLabel}
        type="date"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </Field>
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
    <OptionSelect
      ariaLabel={ariaLabel}
      label={label}
      options={[
        { label: defaultItem, value: "all" },
        ...options.map((option) => ({ label: option, value: option })),
      ]}
      value={value}
      onChange={onChange}
    />
  );
}

function OptionSelect({
  ariaLabel,
  label,
  options,
  value,
  onChange,
}: {
  ariaLabel: string;
  label: string;
  options: Array<{ label: string; value: string }>;
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
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </Field>
  );
}

interface AgmMilestoneFiltersProps {
  doneFilter: string;
  hasActiveFilters: boolean;
  notesFilter: string;
  responsibleFilter: string;
  responsibleOptions: string[];
  statusFilter: string;
  targetFromFilter: string;
  targetToFilter: string;
  taskFilter: string;
  trackFilter: string;
  onClearFilters: () => void;
  onDoneFilterChange: (value: string) => void;
  onNotesFilterChange: (value: string) => void;
  onResponsibleFilterChange: (value: string) => void;
  onStatusFilterChange: (value: string) => void;
  onTargetFromFilterChange: (value: string) => void;
  onTargetToFilterChange: (value: string) => void;
  onTaskFilterChange: (value: string) => void;
  onTrackFilterChange: (value: string) => void;
}
