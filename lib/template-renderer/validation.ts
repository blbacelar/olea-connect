import {
  fieldLabel,
  getValue,
  isFieldComplete,
  isVisible,
} from "./schema";
import {
  isValidDecimalInput,
  normalizeEmail,
  normalizeHttpUrl,
} from "@/lib/input-validation";
import type {
  FieldPath,
  TemplateField,
  TemplateFieldSchema,
  TemplateFormData,
  TemplateValue,
} from "./types";

export interface TemplateValidationError {
  path: string;
  message: string;
}

export function calculateCompletionPercent(
  schema: TemplateFieldSchema,
  data: TemplateFormData,
) {
  const fields = collectCompletableFields(schema, data);
  if (fields.length === 0) return 100;
  const complete = fields.filter(({ field, value }) =>
    isFieldComplete(field, value),
  ).length;
  return Math.round((complete / fields.length) * 100);
}

export function validateTemplateData(
  schema: TemplateFieldSchema,
  data: TemplateFormData,
): TemplateValidationError[] {
  const fields = [
    ...(schema.header_fields ?? []),
    ...schema.sections.flatMap((section) => section.questions),
  ];
  return validateFields(fields, data, []);
}

function collectCompletableFields(
  schema: TemplateFieldSchema,
  data: TemplateFormData,
) {
  const fields = [
    ...(schema.header_fields ?? []),
    ...schema.sections.flatMap((section) => section.questions),
  ];
  return collectFields(fields, data, []);
}

function collectFields(
  fields: TemplateField[],
  data: unknown,
  parentPath: FieldPath,
): Array<{ field: TemplateField; value: TemplateValue; path: FieldPath }> {
  return fields.flatMap((field) => {
    if (!isVisible(field, data)) return [];
    const path = [...parentPath, field.id];
    const value = getValue(data, [field.id]);
    if (field.type === "heading" || field.type === "paragraph") return [];

    if (field.type !== "repeatable") {
      return [{ field, value, path }];
    }

    const rows = Array.isArray(value) ? value : [];
    return [
      { field, value, path },
      ...rows.flatMap((row, index) =>
        collectFields(field.subfields ?? [], row, [...path, index]),
      ),
    ];
  });
}

function validateFields(
  fields: TemplateField[],
  data: unknown,
  parentPath: FieldPath,
): TemplateValidationError[] {
  return fields.flatMap((field) => {
    if (!isVisible(field, data)) return [];
    const path = [...parentPath, field.id];
    const value = getValue(data, [field.id]);
    const errors = validateField(field, value, path);

    if (field.type !== "repeatable") return errors;
    const rows = Array.isArray(value) ? value : [];
    return [
      ...errors,
      ...rows.flatMap((row, index) =>
        validateFields(field.subfields ?? [], row, [...path, index]),
      ),
    ];
  });
}

function validateField(
  field: TemplateField,
  value: TemplateValue,
  path: FieldPath,
): TemplateValidationError[] {
  if (field.type === "heading" || field.type === "paragraph") return [];
  const label = fieldLabel(field);
  const pathKey = path.join(".");
  const errors: TemplateValidationError[] = [];

  if (field.required && !isFieldComplete(field, value)) {
    errors.push({ path: pathKey, message: `${label} is required.` });
    return errors;
  }

  if (value === undefined || value === null || value === "") return errors;

  if (field.type === "checkbox" && typeof value !== "boolean") {
    errors.push({ path: pathKey, message: `${label} must be true or false.` });
  }

  if (
    (field.type === "number" ||
      field.type === "currency" ||
      field.type === "rating") &&
    (typeof value !== "number" &&
      (typeof value !== "string" || !isValidDecimalInput(value)))
  ) {
    errors.push({ path: pathKey, message: `${label} must be a number.` });
  }

  if (
    (field.type === "number" ||
      field.type === "currency" ||
      field.type === "rating") &&
    (typeof value === "number" &&
      (!Number.isFinite(value) || Math.round(value * 100) !== value * 100))
  ) {
    errors.push({
      path: pathKey,
      message: `${label} must be a number with up to 2 decimals.`,
    });
  }

  const numericValue = Number(value);
  if (field.validation?.min !== undefined && numericValue < field.validation.min) {
    errors.push({
      path: pathKey,
      message: `${label} must be at least ${field.validation.min}.`,
    });
  }
  if (field.validation?.max !== undefined && numericValue > field.validation.max) {
    errors.push({
      path: pathKey,
      message: `${label} must be at most ${field.validation.max}.`,
    });
  }

  if (typeof value === "string") {
    if (
      field.validation?.minLength !== undefined &&
      value.trim().length < field.validation.minLength
    ) {
      errors.push({
        path: pathKey,
        message: `${label} must be at least ${field.validation.minLength} characters.`,
      });
    }
    if (
      field.validation?.maxLength !== undefined &&
      value.length > field.validation.maxLength
    ) {
      errors.push({
        path: pathKey,
        message: `${label} must be ${field.validation.maxLength} characters or fewer.`,
      });
    }
    if (field.validation?.pattern) {
      const pattern = new RegExp(field.validation.pattern);
      if (!pattern.test(value)) {
        errors.push({ path: pathKey, message: `${label} is not valid.` });
      }
    }
    if (field.type === "email") {
      try {
        normalizeEmail(value, label);
      } catch {
        errors.push({ path: pathKey, message: `${label} must be a valid email.` });
      }
    }
    if (field.type === "url") {
      try {
        normalizeHttpUrl(value, label);
      } catch {
        errors.push({ path: pathKey, message: `${label} must be a valid URL.` });
      }
    }
  }

  return errors;
}
