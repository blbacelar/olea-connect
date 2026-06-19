import {
  Document,
  Image,
  Page,
  StyleSheet,
  Text,
  View,
  renderToBuffer,
} from "@react-pdf/renderer";
import React from "react";

import type { BrandProfile } from "@/lib/types";

import type { TemplateExportModel } from "./export-model";
import { getEmbeddedLogo } from "./logo-data";

const styles = StyleSheet.create({
  page: {
    padding: 42,
    fontFamily: "Helvetica",
    color: "#1F2937",
    fontSize: 10,
    lineHeight: 1.45,
  },
  accent: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 12,
  },
  title: {
    fontSize: 26,
    fontFamily: "Helvetica-Bold",
    lineHeight: 1.2,
    marginTop: 14,
    marginBottom: 6,
  },
  org: {
    fontSize: 11,
    color: "#4B5563",
    lineHeight: 1.25,
    marginTop: 0,
    marginBottom: 22,
  },
  logo: {
    width: 52,
    height: 52,
    borderRadius: 26,
    color: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 16,
    fontFamily: "Helvetica-Bold",
  },
  section: {
    marginTop: 18,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
  },
  sectionTitle: {
    fontSize: 15,
    fontFamily: "Helvetica-Bold",
    marginBottom: 4,
  },
  description: {
    color: "#4B5563",
    marginBottom: 10,
  },
  field: {
    marginBottom: 8,
  },
  label: {
    fontFamily: "Helvetica-Bold",
    marginBottom: 2,
  },
  value: {
    color: "#374151",
  },
  heading: {
    fontSize: 12,
    fontFamily: "Helvetica-Bold",
    marginTop: 6,
    marginBottom: 6,
  },
  footer: {
    position: "absolute",
    bottom: 22,
    left: 42,
    right: 42,
    flexDirection: "row",
    justifyContent: "space-between",
    color: "#6B7280",
    fontSize: 8,
  },
});

export async function renderTemplatePdfBuffer({
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

  return renderToBuffer(
    React.createElement(
      Document,
      { title: `${organizationName} ${title}`, author: "Olea Connects" },
      React.createElement(
        Page,
        { size: "LETTER", style: styles.page, wrap: true },
        React.createElement(View, {
          style: [styles.accent, { backgroundColor: brand.secondaryColor }],
          fixed: true,
        }),
        React.createElement(
          View,
          {
            style: [styles.logo, { backgroundColor: brand.primaryColor }],
            fixed: true,
          },
          logo
            ? React.createElement(Image, {
                src: logo.dataUrl,
                style: {
                  width: 44,
                  height: 44,
                  objectFit: "contain",
                },
              })
            : React.createElement(Text, null, brand.logoInitials),
        ),
        React.createElement(Text, { style: styles.title }, title),
        React.createElement(Text, { style: styles.org }, organizationName),
        React.createElement(FieldList, { fields: model.headerFields }),
        model.sections.map((section) =>
          React.createElement(
            View,
            { key: section.id, style: styles.section, minPresenceAhead: 72 },
            React.createElement(
              Text,
              { style: styles.sectionTitle, wrap: false, minPresenceAhead: 48 },
              section.title,
            ),
            section.description
              ? React.createElement(
                  Text,
                  { style: styles.description, minPresenceAhead: 36 },
                  section.description,
                )
              : null,
            React.createElement(FieldList, { fields: section.fields }),
          ),
        ),
        React.createElement(
          View,
          { style: styles.footer, fixed: true },
          React.createElement(Text, null, organizationName),
          React.createElement(Text, {
            render: ({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`,
          }),
        ),
      ),
    ),
  );
}

function FieldList({ fields }: { fields: TemplateExportModel["headerFields"] }) {
  const firstNestedFieldByHeading = new Set<string>();
  for (const [index, field] of fields.entries()) {
    if (field.type !== "heading" && field.type !== "repeatable") continue;
    const nextField = fields[index + 1];
    if (nextField && nextField.depth > field.depth) {
      firstNestedFieldByHeading.add(nextField.id);
    }
  }

  return React.createElement(
    React.Fragment,
    null,
    fields.map((field, index) => {
      if (field.type === "heading" || field.type === "repeatable") {
        const nextField = fields[index + 1];
        const hasNestedContent = nextField && nextField.depth > field.depth;
        return React.createElement(
          Text,
          {
            key: field.id,
            style: [styles.heading, { marginLeft: field.depth * 12 }],
            minPresenceAhead: hasNestedContent ? 54 : 24,
            wrap: false,
          },
          field.label,
        );
      }
      if (field.type === "paragraph") {
        return React.createElement(
          Text,
          {
            key: field.id,
            style: [styles.value, { marginLeft: field.depth * 12 }],
            orphans: 2,
            widows: 2,
          },
          field.value,
        );
      }

      return React.createElement(
        View,
        {
          key: field.id,
          style: [styles.field, { marginLeft: field.depth * 12 }],
          minPresenceAhead: firstNestedFieldByHeading.has(field.id) ? 28 : 0,
          ...(shouldKeepFieldTogether(field.value) ? { wrap: false } : {}),
        },
        React.createElement(Text, { style: styles.label }, field.label),
        React.createElement(
          Text,
          { style: styles.value, orphans: 2, widows: 2 },
          field.value,
        ),
      );
    }),
  );
}

function shouldKeepFieldTogether(value: string) {
  return value.length <= 240 && !value.includes("\n");
}
