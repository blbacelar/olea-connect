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
    paddingTop: 110,
    paddingRight: 42,
    paddingBottom: 96,
    paddingLeft: 42,
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
  header: {
    position: "absolute",
    top: 28,
    left: 42,
    right: 42,
    height: 48,
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  headerText: {
    marginLeft: 10,
    flexGrow: 1,
    height: 34,
    justifyContent: "center",
  },
  headerOrg: {
    fontSize: 10,
    fontFamily: "Helvetica-Bold",
    color: "#1F2937",
  },
  title: {
    fontSize: 24,
    fontFamily: "Helvetica-Bold",
    lineHeight: 1.2,
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
    width: 34,
    height: 34,
    borderRadius: 17,
    color: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
  },
  section: {
    marginTop: 18,
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
  footerRule: {
    position: "absolute",
    top: 735,
    left: 42,
    right: 42,
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
  },
  footerText: {
    position: "absolute",
    top: 748,
    left: 42,
    right: 42,
    color: "#4B5563",
    fontSize: 7,
    textAlign: "center",
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
  const footerText = buildFooterText(brand, model);

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
          { style: styles.header, fixed: true },
          React.createElement(BrandLogo, { brand, logo }),
          React.createElement(
            View,
            { style: styles.headerText },
            React.createElement(Text, { style: styles.headerOrg }, organizationName),
          ),
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
          React.Fragment,
          null,
          React.createElement(View, { style: styles.footerRule, fixed: true }),
          React.createElement(Text, {
            fixed: true,
            wrap: false,
            style: styles.footerText,
            render: ({ pageNumber, totalPages }) =>
              `${footerText}  |  Page ${pageNumber}/${totalPages}`,
          }),
        ),
      ),
    ),
  );
}

function BrandLogo({
  brand,
  logo,
}: {
  brand: BrandProfile;
  logo: ReturnType<typeof getEmbeddedLogo>;
}) {
  return React.createElement(
    View,
    { style: [styles.logo, { backgroundColor: brand.primaryColor }] },
    logo
      ? React.createElement(Image, {
          src: logo.dataUrl,
          style: {
            width: 30,
            height: 30,
            objectFit: "contain",
          },
        })
      : React.createElement(Text, null, brand.logoInitials),
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

export function buildFooterText(
  brand: BrandProfile,
  model: TemplateExportModel,
) {
  const contactEmail =
    brand.contactEmail ??
    findFieldValue(model, [
      "contact_email",
      "contact email",
      "facilitator_email",
      "facilitator email",
      "administrator email",
    ]);
  const contactDetails = [
    brand.address ? `Address: ${formatFooterValue(brand.address)}` : null,
    brand.phone ? `Phone: ${formatFooterValue(brand.phone)}` : null,
    contactEmail ? `Email: ${contactEmail}` : null,
    brand.website ? `Web: ${formatWebsite(brand.website)}` : null,
  ].filter(isPresent);

  return [
    brand.organizationName,
    ...contactDetails,
  ].join("  |  ");
}

function findFieldValue(model: TemplateExportModel, candidates: string[]) {
  const normalizedCandidates = new Set(candidates.map(normalizeFieldKey));
  const fields = [
    ...model.headerFields,
    ...model.sections.flatMap((section) => section.fields),
  ];
  const match = fields.find(
    (field) =>
      normalizedCandidates.has(normalizeFieldKey(field.id)) ||
      normalizedCandidates.has(normalizeFieldKey(field.label)),
  );
  const value = match?.value?.trim();
  return value && value !== "—" ? value : undefined;
}

function normalizeFieldKey(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function formatFooterValue(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

function formatWebsite(value: string) {
  return formatFooterValue(value).replace(/^https?:\/\//i, "").replace(/\/$/, "");
}

function isPresent(value: string | null | undefined): value is string {
  return Boolean(value?.trim());
}
