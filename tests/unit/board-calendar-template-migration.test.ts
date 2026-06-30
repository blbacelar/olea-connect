import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { normalizeTemplateSchema } from "@/lib/template-renderer/schema";
import type {
  TemplateField,
  TemplateSection,
} from "@/lib/template-renderer/types";

const migrationPath = join(
  process.cwd(),
  "supabase/migrations/20260622193112_add_board_calendar_workflow_template.sql",
);
const presentationMigrationPath = join(
  process.cwd(),
  "supabase/migrations/20260622235500_board_calendar_editor_presentation.sql",
);
const snapshotSyncMigrationPath = join(
  process.cwd(),
  "supabase/migrations/20260623012421_sync_board_calendar_instance_snapshots.sql",
);
const refactorMigrationPath = join(
  process.cwd(),
  "supabase/migrations/20260629222141_refactor_board_calendar_setup_workflow.sql",
);
const migrationSql = readFileSync(migrationPath, "utf8");
const presentationMigrationSql = readFileSync(presentationMigrationPath, "utf8");
const snapshotSyncMigrationSql = readFileSync(snapshotSyncMigrationPath, "utf8");
const refactorMigrationSql = readFileSync(refactorMigrationPath, "utf8");

function extractJsonBlock(label: string) {
  const match = migrationSql.match(
    new RegExp(`\\$${label}\\$([\\s\\S]*?)\\$${label}\\$`),
  );
  if (!match) throw new Error(`Missing $${label}$ block in migration.`);
  return JSON.parse(match[1]);
}

function findSection(sections: TemplateSection[], id: string) {
  const section = sections.find((item) => item.id === id);
  if (!section) throw new Error(`Missing section ${id}`);
  return section;
}

function findQuestion(section: TemplateSection, id: string) {
  const field = section.questions.find((item) => item.id === id);
  if (!field) throw new Error(`Missing question ${id}`);
  return field;
}

function findSubfield(field: TemplateField, id: string) {
  const subfield = field.subfields?.find((item) => item.id === id);
  if (!subfield) throw new Error(`Missing subfield ${id}`);
  return subfield;
}

describe("board calendar workflow template migration", () => {
  it("publishes the workbook-inspired dynamic template catalog record", () => {
    expect(migrationSql).toContain("board-calendar-operational-workflow");
    expect(migrationSql).toContain("Board Calendar & Operational Workflow");
    expect(migrationSql).toContain("'dynamic_form'");
    expect(migrationSql).toContain("'form'");
    expect(migrationSql).toContain("supports_docx");
  });

  it("captures the workbook tabs as dynamic template sections", () => {
    const schema = normalizeTemplateSchema(extractJsonBlock("schema"));
    expect(schema).not.toBeNull();

    expect(schema?.presentation?.section_layout).toBe("tabs");
    expect(schema?.presentation?.calendar).toMatchObject({
      enabled: true,
      source: "meetings",
    });
    expect(schema?.sections.map((section) => section.id)).toEqual([
      "getting_started",
      "committees",
      "operational_calendar",
      "annual_calendar",
      "monthly_calendar",
      "meeting_schedule",
      "staff_tasks",
      "agm_timeline",
      "colour_key",
    ]);
  });

  it("models the meeting schedule and operational workflow fields", () => {
    const schema = normalizeTemplateSchema(extractJsonBlock("schema"));
    if (!schema) throw new Error("Template schema did not normalize.");

    const meetingSchedule = findSection(schema.sections, "meeting_schedule");
    const meetings = findQuestion(meetingSchedule, "meetings");
    expect(meetings.type).toBe("repeatable");
    expect(meetings.required).toBe(true);

    expect(findSubfield(meetings, "date")).toMatchObject({
      type: "date",
      required: true,
    });
    expect(findSubfield(meetings, "type")).toMatchObject({
      type: "select",
      required: true,
    });
    expect(findSubfield(meetings, "virtual_link").type).toBe("url");

    const annualHighlights = findQuestion(
      findSection(schema.sections, "annual_calendar"),
      "annual_highlights",
    );
    expect(findSubfield(annualHighlights, "month").options).toContain("April");
    expect(findSubfield(annualHighlights, "category").options).toContain(
      "Key Deadline",
    );

    const monthlyPriorities = findQuestion(
      findSection(schema.sections, "monthly_calendar"),
      "monthly_priorities",
    );
    expect(findSubfield(monthlyPriorities, "item")).toMatchObject({
      type: "text",
      required: true,
    });

    expect(findSection(schema.sections, "operational_calendar").layout).toBe(
      "two_column",
    );

    const staffTasks = findQuestion(
      findSection(schema.sections, "staff_tasks"),
      "tasks",
    );
    expect(findSubfield(staffTasks, "status").options).toEqual([
      "Not Started",
      "In Progress",
      "Complete",
    ]);

    const agmMilestones = findQuestion(
      findSection(schema.sections, "agm_timeline"),
      "agm_milestones",
    );
    expect(findSubfield(agmMilestones, "weeks_before").validation).toEqual({
      min: -12,
      max: 52,
    });
  });

  it("refactors setup defaults and AGM timeline toward days-before generation", () => {
    expect(refactorMigrationSql).toContain("'title', 'Setup'");
    expect(refactorMigrationSql).toContain("'{committees}'");
    expect(refactorMigrationSql).toContain("'{agm_milestones}'");
    expect(refactorMigrationSql).toContain("'{operational_task_rules}'");
    expect(refactorMigrationSql).toContain("'label', 'Send save-the-date'");
    expect(refactorMigrationSql).toContain("'days_before', 42");
    expect(refactorMigrationSql).toContain("'days_after', 1");
    expect(refactorMigrationSql).toContain("'id', 'days_before'");
    expect(refactorMigrationSql).toContain("'label', 'Days before AGM'");
    expect(refactorMigrationSql).toContain("milestone.value - 'weeks_before'");
  });

  it("uses color picker fields for calendar colour keys", () => {
    const schema = normalizeTemplateSchema(extractJsonBlock("schema"));
    if (!schema) throw new Error("Template schema did not normalize.");

    const eventCategories = findQuestion(
      findSection(schema.sections, "colour_key"),
      "event_categories",
    );
    expect(findSubfield(eventCategories, "hex_code")).toMatchObject({
      type: "color",
      validation: { pattern: "^#[0-9A-Fa-f]{6}$" },
    });
  });

  it("seeds default lead times, categories, and paid-plan access", () => {
    expect(migrationSql).toContain("'save_the_date_days', 42");
    expect(migrationSql).toContain("'agenda_request_days', 28");
    expect(migrationSql).toContain("'package_sent_days', 12");
    expect(migrationSql).toContain("'action_items_after_days', 1");
    expect(migrationSql).toContain("'Board Meeting', 'hex_code', '#1A6B6B'");
    expect(migrationSql).toContain("'Committee Meeting', 'hex_code', '#4A3580'");

    expect(migrationSql).toContain(
      "('10000000-0000-4000-8000-000000000007', 'roots')",
    );
    expect(migrationSql).toContain(
      "('10000000-0000-4000-8000-000000000007', 'canopy')",
    );
    expect(migrationSql).toContain(
      "('10000000-0000-4000-8000-000000000007', 'harvest')",
    );
  });

  it("updates existing board calendar definitions with editor presentation metadata", () => {
    expect(presentationMigrationSql).toContain(
      "board-calendar-operational-workflow",
    );
    expect(presentationMigrationSql).toContain("'section_layout', 'tabs'");
    expect(presentationMigrationSql).toContain("'calendar'");
    expect(presentationMigrationSql).toContain("'enabled', true");
    expect(presentationMigrationSql).toContain("'source', 'meetings'");
    expect(presentationMigrationSql).toContain("'layout', 'two_column'");
    expect(presentationMigrationSql).toContain("'type', 'color'");
    expect(presentationMigrationSql).toContain("schema_version = greatest");
  });

  it("syncs existing board calendar instance snapshots to the updated definition", () => {
    expect(snapshotSyncMigrationSql).toContain("public.template_instances");
    expect(snapshotSyncMigrationSql).toContain(
      "board-calendar-operational-workflow",
    );
    expect(snapshotSyncMigrationSql).toContain(
      "schema_snapshot = definition.field_schema",
    );
    expect(snapshotSyncMigrationSql).toContain(
      "definition_version = definition.schema_version",
    );
  });
});
