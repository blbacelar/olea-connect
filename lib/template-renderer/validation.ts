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

  if (field.required && !isFieldComplete(field, value)) {
    return [buildValidationError(pathKey, `${label} is required.`)];
  }

  if (isBlankTemplateValue(value)) return [];

  return [
    ...validateBooleanField(field, value, pathKey, label),
    ...validateNumericField(field, value, pathKey, label),
    ...validateNumericRange(field, value, pathKey, label),
    ...validateStringField(field, value, pathKey, label),
  ];
}

function buildValidationError(
  path: string,
  message: string,
): TemplateValidationError {
  return { message, path };
}

function isBlankTemplateValue(value: TemplateValue) {
  return value === undefined || value === null || value === "";
}

function validateBooleanField(
  field: TemplateField,
  value: TemplateValue,
  pathKey: string,
  label: string,
) {
  if (field.type !== "checkbox" || typeof value === "boolean") {
    return [];
  }

  return [buildValidationError(pathKey, `${label} must be true or false.`)];
}

function validateNumericField(
  field: TemplateField,
  value: TemplateValue,
  pathKey: string,
  label: string,
) {
  if (!isNumericField(field)) return [];

  if (!isValidNumericValue(value)) {
    return [buildValidationError(pathKey, `${label} must be a number.`)];
  }

  if (!hasValidNumericPrecision(value)) {
    return [
      buildValidationError(
        pathKey,
        `${label} must be a number with up to 2 decimals.`,
      ),
    ];
  }

  return [];
}

function isNumericField(field: TemplateField) {
  return (
    field.type === "number" ||
    field.type === "currency" ||
    field.type === "rating"
  );
}

function isValidNumericValue(value: TemplateValue) {
  return (
    typeof value === "number" ||
    (typeof value === "string" && isValidDecimalInput(value))
  );
}

function hasValidNumericPrecision(value: TemplateValue) {
  if (typeof value !== "number") return true;
  return Number.isFinite(value) && Math.round(value * 100) === value * 100;
}

function validateNumericRange(
  field: TemplateField,
  value: TemplateValue,
  pathKey: string,
  label: string,
) {
  const errors: TemplateValidationError[] = [];
  const numericValue = Number(value);

  if (field.validation?.min !== undefined && numericValue < field.validation.min) {
    errors.push(
      buildValidationError(
        pathKey,
        `${label} must be at least ${field.validation.min}.`,
      ),
    );
  }

  if (field.validation?.max !== undefined && numericValue > field.validation.max) {
    errors.push(
      buildValidationError(
        pathKey,
        `${label} must be at most ${field.validation.max}.`,
      ),
    );
  }

  return errors;
}

function validateStringField(
  field: TemplateField,
  value: TemplateValue,
  pathKey: string,
  label: string,
) {
  if (typeof value !== "string") return [];

  return [
    ...validateStringLength(field, value, pathKey, label),
    ...validateStringPattern(field, value, pathKey, label),
    ...validateEmailField(field, value, pathKey, label),
    ...validateUrlField(field, value, pathKey, label),
  ];
}

function validateStringLength(
  field: TemplateField,
  value: string,
  pathKey: string,
  label: string,
) {
  const errors: TemplateValidationError[] = [];

  if (
    field.validation?.minLength !== undefined &&
    value.trim().length < field.validation.minLength
  ) {
    errors.push(
      buildValidationError(
        pathKey,
        `${label} must be at least ${field.validation.minLength} characters.`,
      ),
    );
  }

  if (
    field.validation?.maxLength !== undefined &&
    value.length > field.validation.maxLength
  ) {
    errors.push(
      buildValidationError(
        pathKey,
        `${label} must be ${field.validation.maxLength} characters or fewer.`,
      ),
    );
  }

  return errors;
}

function validateStringPattern(
  field: TemplateField,
  value: string,
  pathKey: string,
  label: string,
) {
  if (!field.validation?.pattern) return [];

  const pattern = new RegExp(field.validation.pattern);
  return pattern.test(value)
    ? []
    : [buildValidationError(pathKey, `${label} is not valid.`)];
}

function validateEmailField(
  field: TemplateField,
  value: string,
  pathKey: string,
  label: string,
) {
  if (field.type !== "email") return [];

  try {
    normalizeEmail(value, label);
    return [];
  } catch {
    return [buildValidationError(pathKey, `${label} must be a valid email.`)];
  }
}

function validateUrlField(
  field: TemplateField,
  value: string,
  pathKey: string,
  label: string,
) {
  if (field.type !== "url") return [];

  try {
    normalizeHttpUrl(value, label);
    return [];
  } catch {
    return [buildValidationError(pathKey, `${label} must be a valid URL.`)];
  }
}
