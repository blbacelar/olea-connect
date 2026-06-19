import type {
  FieldPath,
  TemplateField,
  TemplateFieldOption,
  TemplateFieldSchema,
  TemplateFormData,
  TemplateValue,
} from "./types";

const displayOnlyTypes = new Set(["heading", "paragraph"]);

export function normalizeTemplateSchema(value: unknown): TemplateFieldSchema | null {
  if (!value || typeof value !== "object") return null;
  const schema = value as Partial<TemplateFieldSchema>;
  if (!Array.isArray(schema.sections)) return null;

  return {
    version: Number(schema.version ?? 1),
    header_fields: Array.isArray(schema.header_fields)
      ? schema.header_fields
      : [],
    sections: schema.sections,
  };
}

export function normalizeOptions(
  options: TemplateField["options"] = [],
): TemplateFieldOption[] {
  return options.map((option) =>
    typeof option === "string" ? { label: option, value: option } : option,
  );
}

export function fieldLabel(field: TemplateField) {
  return field.label ?? field.text ?? field.id;
}

export function getValue(data: unknown, path: FieldPath): TemplateValue {
  return path.reduce<unknown>((current, segment) => {
    if (current == null) return undefined;
    if (Array.isArray(current) && typeof segment === "number") {
      return current[segment];
    }
    if (typeof current === "object") {
      return (current as Record<string, unknown>)[String(segment)];
    }
    return undefined;
  }, data) as TemplateValue;
}

export function setValue(
  data: TemplateFormData,
  path: FieldPath,
  value: TemplateValue,
): TemplateFormData {
  if (path.length === 0) return data;
  const [head, ...tail] = path;
  const clone: TemplateFormData = { ...data };

  if (tail.length === 0) {
    clone[String(head)] = value;
    return clone;
  }

  clone[String(head)] = setNestedValue(clone[String(head)], tail, value);
  return clone;
}

function setNestedValue(
  current: TemplateValue,
  path: FieldPath,
  value: TemplateValue,
): TemplateValue {
  const [head, ...tail] = path;
  const container =
    typeof head === "number"
      ? Array.isArray(current)
        ? [...current]
        : []
      : current && typeof current === "object" && !Array.isArray(current)
        ? { ...(current as Record<string, TemplateValue>) }
        : {};

  if (tail.length === 0) {
    if (Array.isArray(container) && typeof head === "number") {
      container[head] = value as Record<string, unknown>;
      return container;
    }
    (container as Record<string, TemplateValue>)[String(head)] = value;
    return container as TemplateValue;
  }

  const next = Array.isArray(container)
    ? container[Number(head)]
    : (container as Record<string, TemplateValue>)[String(head)];
  const nested = setNestedValue(next, tail, value);

  if (Array.isArray(container) && typeof head === "number") {
    container[head] = nested as Record<string, unknown>;
    return container;
  }

  (container as Record<string, TemplateValue>)[String(head)] = nested;
  return container as TemplateValue;
}

export function isVisible(field: TemplateField, data: unknown) {
  if (!field.show_if) return true;
  const value = getValue(data, field.show_if.field.split("."));

  if ("exists" in field.show_if) {
    const exists = value !== undefined && value !== null && value !== "";
    return field.show_if.exists ? exists : !exists;
  }

  if ("equals" in field.show_if) {
    return value === field.show_if.equals;
  }

  if ("not_equals" in field.show_if) {
    return value !== field.show_if.not_equals;
  }

  return true;
}

export function getEditableFields(
  schema: TemplateFieldSchema,
  data: TemplateFormData,
) {
  const fields = [
    ...(schema.header_fields ?? []),
    ...schema.sections.flatMap((section) => section.questions),
  ];
  return flattenFields(fields, data);
}

function flattenFields(fields: TemplateField[], data: unknown): TemplateField[] {
  return fields.flatMap((field) => {
    if (!isVisible(field, data) || displayOnlyTypes.has(field.type)) return [];
    if (field.type !== "repeatable") return [field];

    const rows = getValue(data, [field.id]);
    if (!Array.isArray(rows)) return [field];
    return [
      field,
      ...rows.flatMap((row) => flattenFields(field.subfields ?? [], row)),
    ];
  });
}

export function defaultValueForField(field: TemplateField): TemplateValue {
  switch (field.type) {
    case "checkbox":
      return false;
    case "multiselect":
    case "repeatable":
      return [];
    case "number":
    case "currency":
    case "rating":
      return undefined;
    default:
      return "";
  }
}

export function isFieldComplete(field: TemplateField, value: TemplateValue) {
  if (displayOnlyTypes.has(field.type)) return true;
  if (
    !field.required &&
    (value === undefined ||
      value === null ||
      value === "" ||
      value === false ||
      (Array.isArray(value) && value.length === 0))
  ) {
    return true;
  }
  if (field.type === "checkbox") return Boolean(value);
  if (field.type === "repeatable") return Array.isArray(value) && value.length > 0;
  if (Array.isArray(value)) return value.length > 0;
  return value !== undefined && value !== null && String(value).trim().length > 0;
}
