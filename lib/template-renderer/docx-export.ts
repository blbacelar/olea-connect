import {
  AlignmentType,
  Document,
  HeadingLevel,
  ImageRun,
  Packer,
  Paragraph,
  TextRun,
} from "docx";

import type { BrandProfile } from "@/lib/types";

import type { TemplateExportModel } from "./export-model";
import type { EmbeddedLogo } from "./logo-data";
import { docxSvgFallbackPng, getEmbeddedLogo } from "./logo-data";

export async function renderTemplateDocxBuffer({
  title,
  organizationName,
  brand,
  model,
}: {
  title: string;
  organizationName: string;
  brand: BrandProfile;
  model: TemplateExportModel;
}) {
  const logo = getEmbeddedLogo(brand.logoUrl);
  const document = new Document({
    creator: "Olea Connects",
    title: `${organizationName} ${title}`,
    sections: [
      {
        properties: {},
        children: [
          new Paragraph({
            children: logo
              ? [createLogoImageRun(logo, organizationName)]
              : [new TextRun(brand.logoInitials)],
            alignment: AlignmentType.LEFT,
            spacing: { after: 160 },
          }),
          new Paragraph({
            text: title,
            heading: HeadingLevel.TITLE,
            spacing: { after: 120 },
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: organizationName,
                color: stripHash(brand.primaryColor),
                bold: true,
              }),
            ],
            spacing: { after: 280 },
          }),
          ...fieldParagraphs(model.headerFields),
          ...model.sections.flatMap((section) => [
            new Paragraph({
              text: section.title,
              heading: HeadingLevel.HEADING_1,
              spacing: { before: 260, after: 100 },
            }),
            ...(section.description
              ? [
                  new Paragraph({
                    text: section.description,
                    spacing: { after: 120 },
                  }),
                ]
              : []),
            ...fieldParagraphs(section.fields),
          ]),
        ],
      },
    ],
  });

  return Packer.toBuffer(document);
}

function createLogoImageRun(
  logo: NonNullable<EmbeddedLogo>,
  organizationName: string,
) {
  const altText = {
    title: `${organizationName} logo`,
    description: `${organizationName} logo`,
    name: `${organizationName} logo`,
  };
  const transformation = {
    width: 56,
    height: 56,
  };

  if (logo.extension === "svg") {
    return new ImageRun({
      type: "svg",
      data: logo.buffer,
      transformation,
      fallback: {
        type: "png",
        data: docxSvgFallbackPng,
      },
      altText,
    });
  }

  return new ImageRun({
    type: logo.extension,
    data: logo.buffer,
    transformation,
    altText,
  });
}

function fieldParagraphs(fields: TemplateExportModel["headerFields"]) {
  return fields.flatMap((field) => {
    const indent = { left: field.depth * 360 };

    if (field.type === "heading" || field.type === "repeatable") {
      return [
        new Paragraph({
          text: field.label,
          heading: field.depth > 0 ? HeadingLevel.HEADING_3 : HeadingLevel.HEADING_2,
          indent,
          spacing: { before: 160, after: 80 },
        }),
      ];
    }

    if (field.type === "paragraph") {
      return [
        new Paragraph({
          text: field.value,
          indent,
          spacing: { after: 100 },
        }),
      ];
    }

    return [
      new Paragraph({
        children: [
          new TextRun({ text: `${field.label}: `, bold: true }),
          new TextRun(field.value),
        ],
        indent,
        spacing: { after: 100 },
      }),
    ];
  });
}

function stripHash(value: string) {
  return value.replace(/^#/, "");
}
