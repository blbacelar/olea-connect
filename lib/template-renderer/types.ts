import type { BrandProfile, Organization } from "@/lib/types";

export type TemplateFieldType =
  | "text"
  | "textarea"
  | "rich_text"
  | "number"
  | "currency"
  | "rating"
  | "date"
  | "time"
  | "datetime"
  | "checkbox"
  | "select"
  | "multiselect"
  | "repeatable"
  | "signature"
  | "email"
  | "url"
  | "color"
  | "file"
  | "heading"
  | "paragraph";

export type TemplateValue =
  | string
  | number
  | boolean
  | string[]
  | Array<string | Record<string, unknown>>
  | Record<string, unknown>
  | Array<Record<string, unknown>>
  | null
  | undefined;

export type TemplateFormData = Record<string, TemplateValue>;

export interface TemplateFieldOption {
  label: string;
  value: string;
}

export interface TemplateFieldCondition {
  field: string;
  equals?: unknown;
  not_equals?: unknown;
  exists?: boolean;
}

export interface TemplateFieldValidation {
  min?: number;
  max?: number;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
}

export interface TemplateField {
  id: string;
  type: TemplateFieldType;
  label?: string;
  text?: string;
  description?: string;
  placeholder?: string;
  required?: boolean;
  options?: Array<string | TemplateFieldOption>;
  subfields?: TemplateField[];
  validation?: TemplateFieldValidation;
  show_if?: TemplateFieldCondition;
}

export interface TemplateSection {
  id: string;
  title: string;
  description?: string;
  layout?: "default" | "two_column";
  questions: TemplateField[];
}

export interface TemplateSchemaPresentation {
  section_layout?: "stack" | "tabs";
  sectionLayout?: "stack" | "tabs";
  calendar?: {
    enabled?: boolean;
    source?: string;
  };
}

export interface TemplateFieldSchema {
  version: number;
  presentation?: TemplateSchemaPresentation;
  header_fields?: TemplateField[];
  sections: TemplateSection[];
}

export interface DynamicTemplateSession {
  id: string;
  resourceId: string;
  organizationId: string;
  title: string;
  slug: string;
  schemaVersion: number;
  schemaSnapshot: TemplateFieldSchema;
  brandingSnapshot: BrandProfile;
  formData: TemplateFormData;
  completionPercent: number;
  status: "draft" | "completed" | "archived";
  lastSavedAt: string;
}

export type TemplateExportFormat = "pdf" | "docx";

export interface TemplateExportRecord {
  id: string;
  format: TemplateExportFormat;
  fileName: string;
  generatedAt: string;
  generatedBy: string | null;
}

export interface DynamicTemplateEditorData {
  organization: Organization;
  template: {
    id: string;
    slug: string;
    title: string;
    summary: string;
    description: string | null;
    estimatedMinutes: number | null;
    rendererKey: string;
    supportsPdf: boolean;
    supportsDocx: boolean;
  };
  session: DynamicTemplateSession;
  exports: TemplateExportRecord[];
}

export type FieldPath = Array<string | number>;

export interface TemplateSavePayload {
  id: string;
  resourceId: string;
  organizationId: string;
  title: string;
  schemaVersion: number;
  schemaSnapshot: TemplateFieldSchema;
  brandingSnapshot: BrandProfile;
  formData: TemplateFormData;
  completionPercent: number;
  status: "draft" | "completed";
}
