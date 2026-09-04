"use client";

import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  fieldLabel,
  normalizeOptions,
} from "@/lib/template-renderer/schema";
import type {
  TemplateField,
  TemplateValue,
} from "@/lib/template-renderer/types";
import { cn } from "@/lib/utils";

export function FieldInput({
  id,
  field,
  value,
  describedBy,
  hasError,
  onChange,
}: {
  describedBy?: string;
  field: TemplateField;
  hasError: boolean;
  id: string;
  onChange: (value: TemplateValue) => void;
  value: TemplateValue;
}) {
  const inputClassName = cn(hasError && "border-red-300 focus-visible:ring-red-300");

  switch (field.type) {
    case "color":
      return <ColorInput {...{ describedBy, field, hasError, id, inputClassName, onChange, value }} />;
    case "textarea":
    case "rich_text":
      return <TextAreaInput {...{ describedBy, field, hasError, id, inputClassName, onChange, value }} />;
    case "select":
    case "rating":
      return <SelectInput {...{ describedBy, field, hasError, id, inputClassName, onChange, value }} />;
    case "multiselect":
      return <MultiSelectInput {...{ describedBy, field, hasError, onChange, value }} />;
    case "checkbox":
      return <CheckboxInput {...{ describedBy, hasError, id, onChange, value }} />;
    case "file":
      return <FileInput {...{ describedBy, hasError, id, inputClassName, onChange }} />;
    default:
      return <DefaultInput {...{ describedBy, field, hasError, id, inputClassName, onChange, value }} />;
  }
}

type FieldInputProps = {
  describedBy?: string;
  field: TemplateField;
  hasError: boolean;
  id: string;
  inputClassName: string;
  onChange: (value: TemplateValue) => void;
  value: TemplateValue;
};

function ColorInput({
  describedBy,
  field,
  hasError,
  id,
  inputClassName,
  onChange,
  value,
}: FieldInputProps) {
  const colorValue =
    typeof value === "string" && /^#[0-9A-Fa-f]{6}$/.test(value)
      ? value
      : "#000000";

  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
      <Input
        id={id}
        type="color"
        aria-describedby={describedBy}
        aria-invalid={hasError}
        className={cn("h-11 w-full p-1 sm:w-16", inputClassName)}
        value={colorValue}
        onChange={(event) => onChange(event.target.value.toUpperCase())}
      />
      <Input
        aria-label={`${fieldLabel(field)} hex value`}
        aria-describedby={describedBy}
        aria-invalid={hasError}
        className={cn("font-mono uppercase", inputClassName)}
        placeholder={field.placeholder ?? "#1A6B6B"}
        value={value === undefined || value === null ? "" : String(value)}
        onChange={(event) => onChange(event.target.value.toUpperCase())}
      />
    </div>
  );
}

function TextAreaInput({
  describedBy,
  field,
  hasError,
  id,
  inputClassName,
  onChange,
  value,
}: FieldInputProps) {
  return (
    <Textarea
      id={id}
      aria-describedby={describedBy}
      aria-invalid={hasError}
      className={inputClassName}
      placeholder={field.placeholder}
      value={typeof value === "string" ? value : ""}
      onChange={(event) => onChange(event.target.value)}
    />
  );
}

function SelectInput({
  describedBy,
  field,
  hasError,
  id,
  inputClassName,
  onChange,
  value,
}: FieldInputProps) {
  return (
    <Select
      value={value === undefined || value === null ? "" : String(value)}
      onValueChange={(nextValue) =>
        onChange(field.type === "rating" ? Number(nextValue) : nextValue)
      }
    >
      <SelectTrigger
        id={id}
        aria-describedby={describedBy}
        aria-invalid={hasError}
        className={inputClassName}
      >
        <SelectValue placeholder={field.placeholder ?? "Choose one"} />
      </SelectTrigger>
      <SelectContent>
        {normalizeOptions(field.options).map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function MultiSelectInput({
  describedBy,
  field,
  hasError,
  onChange,
  value,
}: Omit<FieldInputProps, "id" | "inputClassName">) {
  const selected = Array.isArray(value) ? value.map(String) : [];

  return (
    <div
      aria-describedby={describedBy}
      aria-invalid={hasError}
      className={cn(
        "grid gap-2 rounded-md border border-slate-200 p-3",
        hasError && "border-red-300",
      )}
    >
      {normalizeOptions(field.options).map((option) => (
        <label
          key={option.value}
          className="flex items-center gap-2 text-sm text-slate-700"
        >
          <Checkbox
            checked={selected.includes(option.value)}
            onChange={(event) => {
              const next = event.target.checked
                ? [...selected, option.value]
                : selected.filter((item) => item !== option.value);
              onChange(next);
            }}
          />
          {option.label}
        </label>
      ))}
    </div>
  );
}

function CheckboxInput({
  describedBy,
  hasError,
  id,
  onChange,
  value,
}: Pick<FieldInputProps, "describedBy" | "hasError" | "id" | "onChange" | "value">) {
  return (
    <label className="flex items-center gap-2 text-sm text-slate-700">
      <Checkbox
        id={id}
        aria-describedby={describedBy}
        aria-invalid={hasError}
        checked={Boolean(value)}
        onChange={(event) => onChange(event.target.checked)}
      />
      Yes
    </label>
  );
}

function FileInput({
  describedBy,
  hasError,
  id,
  inputClassName,
  onChange,
}: Omit<FieldInputProps, "field" | "value">) {
  return (
    <Input
      id={id}
      type="file"
      aria-describedby={describedBy}
      aria-invalid={hasError}
      className={inputClassName}
      onChange={(event) => {
        const file = event.target.files?.[0];
        onChange(file ? { name: file.name, size: file.size } : null);
      }}
    />
  );
}

function DefaultInput({
  describedBy,
  field,
  hasError,
  id,
  inputClassName,
  onChange,
  value,
}: FieldInputProps) {
  return (
    <Input
      id={id}
      type={inputTypeFor(field.type)}
      aria-describedby={describedBy}
      aria-invalid={hasError}
      className={inputClassName}
      placeholder={field.placeholder}
      value={value === undefined || value === null ? "" : String(value)}
      min={field.validation?.min}
      max={field.validation?.max}
      onChange={(event) => onChange(parseInputValue(field, event.target.value))}
    />
  );
}

function parseInputValue(field: TemplateField, rawValue: string) {
  if (field.type !== "number" && field.type !== "currency") return rawValue;
  return rawValue === "" ? undefined : Number(rawValue);
}

function inputTypeFor(type: TemplateField["type"]) {
  switch (type) {
    case "email":
      return "email";
    case "url":
      return "url";
    case "date":
      return "date";
    case "time":
      return "time";
    case "datetime":
      return "datetime-local";
    case "number":
    case "currency":
      return "number";
    default:
      return "text";
  }
}
