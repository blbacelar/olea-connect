"use client";

import { Minus, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export type TermRuleDraft = {
  maxConsecutiveTerms: number | "";
  maxYearsOfService: number | "";
  termLengthYears: number | "";
  upcomingAgmYear: number | "";
};

export function RuleStepper({
  label,
  max,
  min,
  name,
  onChange,
  suffix,
  value,
}: {
  label: string;
  max: number;
  min: number;
  name: string;
  onChange: (value: number | "") => void;
  suffix?: string;
  value: number | "";
}) {
  return (
    <fieldset className="space-y-1.5 text-sm font-semibold text-slate-700">
      <legend>{label}</legend>
      <div className="flex items-center gap-2">
        <Button
          aria-label={`Decrease ${label}`}
          className="size-11 shrink-0"
          disabled={value === "" || value <= min}
          onClick={() => {
            if (value !== "") onChange(Math.max(min, value - 1));
          }}
          size="icon"
          type="button"
          variant="outline"
        >
          <Minus className="size-4" />
        </Button>
        <div className="relative flex-1">
          <Input
            aria-label={label}
            className={suffix ? "pr-14" : undefined}
            inputMode="numeric"
            max={max}
            min={min}
            name={name}
            onChange={(event) => {
              const raw = event.currentTarget.value;
              if (raw === "") {
                onChange("");
                return;
              }
              const next = Number(raw);
              if (Number.isInteger(next)) onChange(next);
            }}
            required
            step={1}
            type="number"
            value={value}
          />
          {suffix ? (
            <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs font-medium text-slate-500">
              {suffix}
            </span>
          ) : null}
        </div>
        <Button
          aria-label={`Increase ${label}`}
          className="size-11 shrink-0"
          disabled={value === "" || value >= max}
          onClick={() => {
            if (value !== "") onChange(Math.min(max, value + 1));
          }}
          size="icon"
          type="button"
          variant="outline"
        >
          <Plus className="size-4" />
        </Button>
      </div>
    </fieldset>
  );
}
