import { describe, expect, it } from "vitest";

import {
  buildExportFileName,
  buildExportStoragePath,
} from "@/lib/template-renderer/export-files";
import { buildTemplateExportModel } from "@/lib/template-renderer/export-model";
import { getEmbeddedLogo } from "@/lib/template-renderer/logo-data";
import { renderTemplateDocxBuffer } from "@/lib/template-renderer/docx-export";
import {
  buildFooterText,
  renderTemplatePdfBuffer,
  sanitizePdfText,
} from "@/lib/template-renderer/pdf-export";
import type { TemplateFieldSchema } from "@/lib/template-renderer/types";
import type { BrandProfile } from "@/lib/types";
import { inspectPdf } from "@/tests/support/pdf-inspector";

const onePixelPng =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";
const onePixelSvg = `data:image/svg+xml;base64,${Buffer.from(
  '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16"><rect width="16" height="16" fill="#2f6b4f"/></svg>',
).toString("base64")}`;

describe("template exports", () => {
  it("uses the required org/template/date filename convention", () => {
    expect(
      buildExportFileName({
        organizationName: "Olea QA Foundation",
        templateName: "Board Meeting Agenda",
        format: "pdf",
        date: new Date("2026-06-19T12:00:00Z"),
      }),
    ).toBe("Olea-QA-Foundation_Board-Meeting-Agenda_2026-06-19.pdf");
  });

  it("stores generated documents under the organization path", () => {
    expect(
      buildExportStoragePath({
        organizationId: "org-1",
        templateInstanceId: "template-1",
        exportId: "export-1",
        fileName: "export.pdf",
      }),
    ).toBe("org-1/template-1/export-1/export.pdf");
  });

  it("recognizes every uploaded logo format supported by brand setup", () => {
    expect(getEmbeddedLogo(onePixelPng)).toMatchObject({
      extension: "png",
      mimeType: "image/png",
    });
    expect(getEmbeddedLogo(onePixelSvg)).toMatchObject({
      extension: "svg",
      mimeType: "image/svg+xml",
    });
  });

  it("builds an export model with repeatable rows and bilingual text", () => {
    const schema: TemplateFieldSchema = {
      version: 1,
      header_fields: [
        { id: "title", type: "text", label: "Title", required: true },
      ],
      sections: [
        {
          id: "agenda",
          title: "Agenda / Ordre du jour",
          questions: [
            {
              id: "items",
              type: "repeatable",
              label: "Agenda item",
              subfields: [
                { id: "topic", type: "text", label: "Topic / Sujet" },
                { id: "notes", type: "textarea", label: "Notes" },
              ],
            },
          ],
        },
      ],
    };

    const model = buildTemplateExportModel({
      schema,
      formData: {
        title: "Réunion annuelle",
        items: [
          {
            topic: "Finances",
            notes: "Approve budget / Approuver le budget",
          },
        ],
      },
    });

    expect(model.headerFields[0]).toMatchObject({
      label: "Title",
      value: "Réunion annuelle",
    });
    expect(model.sections[0].title).toBe("Agenda / Ordre du jour");
    expect(model.sections[0].fields.map((field) => field.value)).toContain(
      "Approve budget / Approuver le budget",
    );
  });

  it("builds a one-line PDF footer with organization contact details", () => {
    const model = buildTemplateExportModel({
      schema: {
        version: 1,
        header_fields: [
          {
            id: "facilitator_email",
            type: "email",
            label: "Facilitator email",
          },
        ],
        sections: [],
      },
      formData: { facilitator_email: "fallback@example.org" },
    });
    const footer = buildFooterText(
      {
        organizationName: "Olea QA Foundation",
        primaryColor: "#2f6b4f",
        secondaryColor: "#dbe8dd",
        logoInitials: "OQ",
        address: "123 Main Street\nCalgary, AB",
        phone: "+1 555 123 4567",
        contactEmail: "hello@example.org",
        website: "https://example.org",
      },
      model,
    );

    expect(footer).toBe(
      "Olea QA Foundation  |  Address: 123 Main Street Calgary, AB  |  Phone: +1 555 123 4567  |  Email: hello@example.org  |  Web: example.org",
    );
  });

  it("sanitizes text that is risky for PDF built-in fonts", () => {
    expect(sanitizePdfText("H₂O and x²\u0000")).toBe("H2O and x2");
  });

  it("uses saved snapshots so historical exports do not change after edits", () => {
    const savedSchema: TemplateFieldSchema = {
      version: 1,
      sections: [
        {
          id: "overview",
          title: "Overview",
          questions: [{ id: "summary", type: "textarea", label: "Summary" }],
        },
      ],
    };
    const savedFormData = {
      summary: "Saved answer",
    };

    const model = buildTemplateExportModel({
      schema: savedSchema,
      formData: savedFormData,
    });
    savedSchema.sections[0].questions[0].label = "Edited summary";
    savedFormData.summary = "Edited answer";

    expect(model.sections[0].fields[0]).toMatchObject({
      label: "Summary",
      value: "Saved answer",
    });
  });

  it("renders PDF and DOCX buffers for long repeatable bilingual content", async () => {
    const schema: TemplateFieldSchema = {
      version: 1,
      sections: [
        {
          id: "long-form",
          title: "Board Notes / Notes du conseil",
          questions: [
            {
              id: "items",
              type: "repeatable",
              label: "Discussion item",
              subfields: [
                { id: "topic", type: "text", label: "Topic / Sujet" },
                { id: "decision", type: "textarea", label: "Decision / Décision" },
              ],
            },
          ],
        },
      ],
    };
    const longBilingualText = "Approve the annual budget. Approuver le budget annuel. ".repeat(80);
    const model = buildTemplateExportModel({
      schema,
      formData: {
        items: Array.from({ length: 8 }, (_, index) => ({
          topic: `Item ${index + 1} / Point ${index + 1}`,
          decision: longBilingualText,
        })),
      },
    });
    const brand: BrandProfile = {
      organizationName: "Olea QA Foundation",
      primaryColor: "#2f6b4f",
      secondaryColor: "#dbe8dd",
      logoInitials: "OC",
      logoUrl: onePixelPng,
    };

    const [pdfBuffer, docxBuffer] = await Promise.all([
      renderTemplatePdfBuffer({
        title: "Board Meeting Agenda",
        organizationName: "Olea QA Foundation",
        brand,
        model,
      }),
      renderTemplateDocxBuffer({
        title: "Board Meeting Agenda",
        organizationName: "Olea QA Foundation",
        brand,
        model,
      }),
    ]);

    expect(pdfBuffer.subarray(0, 4).toString()).toBe("%PDF");
    expect(docxBuffer.subarray(0, 2).toString()).toBe("PK");
    const pdf = await inspectPdf(pdfBuffer);
    expect(pdf.pageCount).toBeGreaterThan(1);
    expect(pdf.metadata).toMatchObject({
      author: "Olea QA Foundation",
      creator: "Olea Connects",
      producer: "Olea Connects",
      subject: "Board-ready document generated by Olea Connects",
      title: "Olea QA Foundation Board Meeting Agenda",
    });
    expect(pdf.text).toContain("Board Meeting Agenda");
    expect(pdf.text).toContain("Olea QA Foundation");
    expect(pdf.text).toContain("Board Notes / Notes du conseil");
    expect(pdf.text).toContain("Approve the annual budget.");
    expect(pdf.text).toContain("Page 1/");
    expect(
      pdfBuffer.toString("latin1").match(/\/Type\s*\/Page\b/g)?.length ?? 0,
    ).toBeGreaterThan(1);
    expect(pdfBuffer.toString("latin1")).toContain("/Subtype /Image");
    expect(docxBuffer.toString("latin1")).toContain("word/media/");
    expect(pdfBuffer.byteLength).toBeGreaterThan(1_000);
    expect(docxBuffer.byteLength).toBeGreaterThan(1_000);
  });

  it("renders SVG logos without breaking PDF or DOCX exports", async () => {
    const model = buildTemplateExportModel({
      schema: {
        version: 1,
        sections: [
          {
            id: "overview",
            title: "Overview",
            questions: [{ id: "summary", type: "text", label: "Summary" }],
          },
        ],
      },
      formData: { summary: "Ready" },
    });
    const brand: BrandProfile = {
      organizationName: "Olea QA Foundation",
      primaryColor: "#2f6b4f",
      secondaryColor: "#dbe8dd",
      logoInitials: "OC",
      logoUrl: onePixelSvg,
    };

    const [pdfBuffer, docxBuffer] = await Promise.all([
      renderTemplatePdfBuffer({
        title: "Logo Test",
        organizationName: "Olea QA Foundation",
        brand,
        model,
      }),
      renderTemplateDocxBuffer({
        title: "Logo Test",
        organizationName: "Olea QA Foundation",
        brand,
        model,
      }),
    ]);

    expect(pdfBuffer.subarray(0, 4).toString()).toBe("%PDF");
    expect(docxBuffer.subarray(0, 2).toString()).toBe("PK");
    const pdf = await inspectPdf(pdfBuffer);
    expect(pdf.metadata.title).toBe("Olea QA Foundation Logo Test");
    expect(pdf.text).toContain("Logo Test");
    expect(pdf.text).toContain("Ready");
    expect(docxBuffer.toString("latin1")).toContain("word/media/");
  });
});
