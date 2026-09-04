"use client";

import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  defaultValueForField,
  fieldLabel,
  getValue,
  isVisible,
} from "@/lib/template-renderer/schema";
import type {
  FieldPath,
  TemplateField,
  TemplateFormData,
  TemplateValue,
} from "@/lib/template-renderer/types";

import { FieldInput } from "./TemplateFieldInput";

export function TemplateFields({
  fields,
  data,
  errorsByPath,
  parentPath = [],
  onChange,
}: {
  fields: TemplateField[];
  data: TemplateFormData | Record<string, unknown>;
  errorsByPath: Map<string, string>;
  parentPath?: FieldPath;
  onChange: (path: FieldPath, value: TemplateValue) => void;
}) {
  return fields.map((field) => {
    if (!isVisible(field, data)) return null;
    const path = [...parentPath, field.id];

    if (field.type === "heading") {
      return (
        <h3 key={path.join(".")} className="pt-2 text-lg font-semibold">
          {field.text ?? field.label}
        </h3>
      );
    }

    if (field.type === "paragraph") {
      return (
        <p key={path.join(".")} className="text-sm leading-6 text-slate-500">
          {field.text ?? field.description}
        </p>
      );
    }

    if (field.type === "repeatable") {
      return (
        <RepeatableField
          key={path.join(".")}
          field={field}
          value={getValue(data, [field.id])}
          path={path}
          errorsByPath={errorsByPath}
          onChange={onChange}
        />
      );
    }

    return (
      <TemplateFieldControl
        key={path.join(".")}
        field={field}
        value={getValue(data, [field.id])}
        path={path}
        error={errorsByPath.get(path.join("."))}
        onChange={onChange}
      />
    );
  });
}

function TemplateFieldControl({
  field,
  value,
  path,
  error,
  onChange,
}: {
  field: TemplateField;
  value: TemplateValue;
  path: FieldPath;
  error?: string;
  onChange: (path: FieldPath, value: TemplateValue) => void;
}) {
  const id = path.join("-");
  const label = fieldLabel(field);
  const describedBy = error ? `${id}-error` : undefined;

  return (
    <div className="space-y-2">
      <Label htmlFor={id}>
        {label}
        {field.required ? <span className="text-red-600"> *</span> : null}
      </Label>
      {field.description ? (
        <p className="text-sm leading-5 text-slate-500">{field.description}</p>
      ) : null}
      <FieldInput
        id={id}
        field={field}
        value={value}
        describedBy={describedBy}
        hasError={Boolean(error)}
        onChange={(nextValue) => onChange(path, nextValue)}
      />
      {error ? (
        <p id={`${id}-error`} className="text-sm font-medium text-red-600">
          {error}
        </p>
      ) : null}
    </div>
  );
}

function RepeatableField({
  field,
  value,
  path,
  errorsByPath,
  onChange,
}: {
  field: TemplateField;
  value: TemplateValue;
  path: FieldPath;
  errorsByPath: Map<string, string>;
  onChange: (path: FieldPath, value: TemplateValue) => void;
}) {
  const rows: Array<Record<string, unknown>> = [];
  if (Array.isArray(value)) {
    for (const row of value) {
      if (isRecord(row)) rows.push(row);
    }
  }
  const label = fieldLabel(field);
  const error = errorsByPath.get(path.join("."));

  const updateRows = (nextRows: Array<Record<string, unknown>>) => {
    onChange(path, nextRows);
  };

  return (
    <div className="space-y-3 rounded-lg border border-slate-200 bg-slate-50 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="font-semibold">
            {label}
            {field.required ? <span className="text-red-600"> *</span> : null}
          </h3>
          {field.description ? (
            <p className="mt-1 text-sm leading-5 text-slate-500">
              {field.description}
            </p>
          ) : null}
        </div>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => updateRows([...rows, createBlankRow(field)])}
        >
          <Plus className="size-4" />
          Add row
        </Button>
      </div>

      {error ? <p className="text-sm font-medium text-red-600">{error}</p> : null}

      {rows.length === 0 ? (
        <p className="rounded-md border border-dashed bg-white px-4 py-6 text-center text-sm text-slate-500">
          No rows yet.
        </p>
      ) : (
        <div className="space-y-3">
          {rows.map((row, index) => (
            <div key={index} className="rounded-lg border bg-white p-4">
              <div className="mb-4 flex items-center justify-between gap-3">
                <p className="text-sm font-semibold text-slate-700">
                  {label} {index + 1}
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    aria-label={`Move ${label} ${index + 1} up`}
                    disabled={index === 0}
                    onClick={() => updateRows(moveRow(rows, index, index - 1))}
                  >
                    <ArrowUp className="size-4" />
                  </Button>
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    aria-label={`Move ${label} ${index + 1} down`}
                    disabled={index === rows.length - 1}
                    onClick={() => updateRows(moveRow(rows, index, index + 1))}
                  >
                    <ArrowDown className="size-4" />
                  </Button>
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    aria-label={`Remove ${label} ${index + 1}`}
                    onClick={() =>
                      updateRows(rows.filter((_, rowIndex) => rowIndex !== index))
                    }
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <TemplateFields
                  fields={field.subfields ?? []}
                  data={row}
                  parentPath={[...path, index]}
                  errorsByPath={errorsByPath}
                  onChange={onChange}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function createBlankRow(field: TemplateField): Record<string, unknown> {
  return Object.fromEntries(
    (field.subfields ?? [])
      .filter((subfield) => subfield.type !== "heading" && subfield.type !== "paragraph")
      .map((subfield) => [subfield.id, defaultValueForField(subfield)]),
  );
}

function moveRow<T>(rows: T[], from: number, to: number) {
  const next = [...rows];
  const [row] = next.splice(from, 1);
  next.splice(to, 0, row);
  return next as Array<Record<string, unknown>>;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
